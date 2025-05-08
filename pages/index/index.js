// index.js
const app = getApp()

Page({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: '',
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    freshProducts: [],
    popularProducts: [],
    loading: true
  },
  onLoad() {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3g9nsaj9f3a1b0ed',
        traceUser: true,
      });
    }
    
    // 获取新鲜出炉商品数据
    this.getFreshProducts()
    
    // 获取人气推荐商品数据
    this.getPopularProducts()
  },
  
  // 获取新鲜出炉商品
  getFreshProducts() {
    this.setData({ loading: true });
    
    console.log('开始获取新鲜出炉商品');
    
    // 使用本地云数据库查询替代云函数
    this.getProductsByType('isNew');
  },
  
  // 获取人气推荐商品
  getPopularProducts() {
    console.log('开始获取人气推荐商品');
    
    // 使用本地云数据库查询替代云函数
    this.getProductsByType('isHot');
  },
  
  // 按类型获取商品（通用方法）
  getProductsByType(type) {
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 构建查询条件
    const condition = { isActive: true };
    condition[type] = true;
    
    console.log(`查询${type}商品，条件:`, condition);
    
    // 首先查看数据库中有多少商品
    db.collection('products').count().then(res => {
      console.log('数据库中总商品数:', res.total);
    });
    
    // 执行查询
    db.collection('products')
      .where(condition)
      .limit(type === 'isNew' ? 10 : 5)  // 新鲜商品保持10条，人气推荐只显示5条
      .get()
      .then(res => {
        console.log(`${type}商品查询结果:`, res.data);
        
        // 确保每个商品都有库存属性
        const products = res.data.map(product => {
          return {
            ...product,
            stock: product.stock !== undefined ? product.stock : 0
          };
        });
        
        // 处理商品图片URL
        this.processProductImages(products, type);
      })
      .catch(err => {
        console.error(`获取${type}商品失败:`, err);
        this.setData({ loading: false });
        
        // 如果本地查询失败，回退到云函数查询
        this.fallbackToCloudFunction(type);
      });
  },
  
  // 处理商品图片，获取临时URL
  processProductImages(products, type) {
    // 收集所有需要转换的云存储图片ID
    const cloudFileIDs = [];
    products.forEach(product => {
      if (product.image && product.image.startsWith('cloud://')) {
        cloudFileIDs.push(product.image);
      }
    });
    
    if (cloudFileIDs.length > 0) {
      console.log(`获取${type}商品图片临时URL:`, cloudFileIDs);
      
      wx.cloud.getTempFileURL({
        fileList: cloudFileIDs,
        success: res => {
          console.log('获取临时文件链接成功', res);
          
          // 创建fileID到tempFileURL的映射
          const fileUrlMap = {};
          if (res.fileList) {
            res.fileList.forEach(item => {
              if (item.fileID && item.tempFileURL) {
                fileUrlMap[item.fileID] = item.tempFileURL;
              }
            });
          }
          
          // 更新商品图片URL
          const updatedProducts = products.map(product => {
            if (product.image && product.image.startsWith('cloud://')) {
              // 如果有对应的临时URL，使用临时URL
              if (fileUrlMap[product.image]) {
                const tempUrl = fileUrlMap[product.image];
                
                // 缓存图片URL
                const cacheKey = `product_image_${product._id}`;
                wx.setStorageSync(cacheKey, tempUrl);
                
                return { ...product, image: tempUrl };
              }
              
              // 尝试从缓存获取
              const cacheKey = `product_image_${product._id}`;
              const cachedUrl = wx.getStorageSync(cacheKey);
              if (cachedUrl) {
                return { ...product, image: cachedUrl };
              }
            }
            return product;
          });
          
          // 更新状态
          if (type === 'isNew') {
            this.setData({
              freshProducts: updatedProducts,
              loading: false
            });
          } else {
            this.setData({
              popularProducts: updatedProducts,
              loading: false
            });
          }
          
          // 预加载图片
          this.preloadProductImages(updatedProducts);
        },
        fail: err => {
          console.error('获取临时文件链接失败', err);
          
          // 即使失败也更新状态，尝试使用缓存
          const updatedProducts = products.map(product => {
            if (product.image && product.image.startsWith('cloud://')) {
              // 尝试从缓存获取
              const cacheKey = `product_image_${product._id}`;
              const cachedUrl = wx.getStorageSync(cacheKey);
              if (cachedUrl) {
                return { ...product, image: cachedUrl };
              }
            }
            return product;
          });
          
          if (type === 'isNew') {
            this.setData({
              freshProducts: updatedProducts,
              loading: false
            });
          } else {
            this.setData({
              popularProducts: updatedProducts,
              loading: false
            });
          }
        }
      });
    } else {
      // 没有云存储图片，直接更新状态
      if (type === 'isNew') {
        this.setData({
          freshProducts: products,
          loading: false
        });
      } else {
        this.setData({
          popularProducts: products,
          loading: false
        });
      }
      
      // 预加载图片
      this.preloadProductImages(products);
    }
  },
  
  // 预加载商品图片
  preloadProductImages(products) {
    products.forEach(product => {
      if (product.image && !product.image.startsWith('/assets/')) {
        wx.getImageInfo({
          src: product.image,
          success(res) {
            console.log(`预加载商品图片成功: ${product.name}`, res.width, res.height);
          },
          fail(err) {
            console.error(`预加载商品图片失败: ${product.name}`, err);
          }
        });
      }
    });
  },
  
  // 回退到云函数查询
  fallbackToCloudFunction(type) {
    console.log(`回退到云函数查询${type}商品`);
    
    const data = {
      onlyActive: true,
      pageSize: type === 'isNew' ? 10 : 5  // 新鲜商品保持10条，人气推荐只显示5条
    };
    
    if (type === 'isNew') {
      data.isNew = true;
    } else {
      data.isHot = true;
    }
    
    wx.cloud.callFunction({
      name: 'getproducts',
      data: data,
      success: res => {
        console.log(`云函数获取${type}商品结果:`, res);
        
        if (res.result && res.result.success) {
          // 确保每个商品都有库存属性
          const products = (res.result.data || []).map(product => {
            return {
              ...product,
              stock: product.stock !== undefined ? product.stock : 0
            };
          });
          
          if (type === 'isNew') {
            this.setData({
              freshProducts: products,
              loading: false
            });
          } else {
            this.setData({
              popularProducts: products,
              loading: false
            });
          }
        }
      },
      fail: err => {
        console.error(`云函数获取${type}商品失败:`, err);
        
        // 如果所有方法都失败，填充一些测试数据
        this.useTestData(type);
      }
    });
  },
  
  // 使用测试数据（最后的备用方案）
  useTestData(type) {
    console.log(`使用测试数据显示${type}商品`);
    
    // 简单的测试数据
    const testData = [
      {
        _id: 'test1',
        name: '提拉米苏',
        image: '/assets/images/products/product-tiramisu.jpg',
        price: 158,
        category: '蛋糕',
        rating: 4.9,
        reviews: 324
      },
      {
        _id: 'test2',
        name: '芒果千层',
        image: '/assets/images/products/product-mango-layer.jpg',
        price: 148,
        category: '蛋糕',
        rating: 4.8,
        reviews: 256
      }
    ];
    
    if (type === 'isNew') {
      this.setData({
        freshProducts: testData,
        loading: false
      });
    } else {
      // 人气推荐只显示5条数据
      this.setData({
        popularProducts: testData.slice(0, 5),
        loading: false
      });
    }
  },
  
  // 跳转到商品详情
  goToProductDetail(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    });
  },
  
  // 添加到购物车
  addToCart(e) {
    const productId = e.currentTarget.dataset.id;
    
    // 检查登录状态
    if (!app.globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再添加商品到购物车',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    // 查找商品
    let product = null;
    // 先在新鲜出炉商品中查找
    product = this.data.freshProducts.find(item => item._id === productId);
    // 如果没找到，再在人气推荐商品中查找
    if (!product) {
      product = this.data.popularProducts.find(item => item._id === productId);
    }
    
    // 如果找到商品，检查库存
    if (product) {
      // 检查库存是否足够
      if (product.stock <= 0) {
        wx.showToast({
          title: '库存不足',
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
    
    wx.cloud.callFunction({
      name: 'cartService',
      data: {
        action: 'addToCart',
        productId: productId,
        quantity: 1
      },
      success: res => {
        console.log('添加购物车成功', res)
        if (res.result && res.result.success) {
          wx.showToast({
            title: '已加入购物车',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: res.result.message || '添加失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('添加购物车失败', err)
        wx.showToast({
          title: '添加失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 查看全部新鲜商品
  viewAllFresh() {
    wx.navigateTo({
      url: '/pages/fresh-all/fresh-all'
    });
  },
  
  // 查看全部人气商品
  viewAllPopular() {
    wx.navigateTo({
      url: '/pages/popular-all/popular-all'
    });
  },
  
  onPullDownRefresh() {
    // 下拉刷新
    this.setData({
      loading: true
    })
    this.getFreshProducts()
    this.getPopularProducts()
    wx.stopPullDownRefresh()
  }
})
