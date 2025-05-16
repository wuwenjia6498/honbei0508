// index.js
const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    freshProducts: [],
    popularProducts: [],
    loading: true,
    searchKeyword: '',
    allProducts: []
  },
  onLoad() {
    console.log('首页加载开始');
    // 检查云环境是否正确初始化
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showToast({
        title: '云环境初始化失败',
        icon: 'none',
        duration: 2000
      });
      // 直接使用测试数据
      this.useTestData('isNew');
      this.useTestData('isHot');
    } else {
      // 初始化云环境
      try {
        console.log('初始化云环境');
        wx.cloud.init({
          env: 'cloud1-3g9nsaj9f3a1b0ed',
          traceUser: true,
        });
        
        console.log('云环境初始化成功，开始获取商品数据');
        
        // 获取新鲜出炉商品数据
        this.getFreshProducts();
        
        // 获取人气推荐商品数据
        this.getPopularProducts();
      } catch (err) {
        console.error('云环境初始化出错:', err);
        // 直接使用测试数据
        this.useTestData('isNew');
        this.useTestData('isHot');
      }
    }
  },
  
  // 处理搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },
  
  // 执行搜索功能
  searchProducts: function(e) {
    const keyword = this.data.searchKeyword;
    console.log('搜索关键词:', keyword);
    
    if (!keyword || keyword.trim() === '') {
      return;
    }
    
    // 导航到搜索结果页面
    wx.navigateTo({
      url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
    });
  },
  
  // 获取新鲜出炉商品
  getFreshProducts() {
    this.setData({ loading: true });
    
    console.log('开始获取新鲜出炉商品');
    
    wx.cloud.callFunction({
      name: 'getproducts',
      data: {
        isNew: true,
        pageSize: 10,
        onlyActive: true
      },
      success: res => {
        console.log('获取新鲜出炉商品结果:', res);
        
        if (res.result && res.result.success && res.result.data && res.result.data.length > 0) {
          // 处理图片URL
          this.processProductImages(res.result.data, 'freshProducts');
        } else {
          console.warn('未获取到新鲜商品数据，使用测试数据');
          this.useTestData('isNew');
        }
      },
      fail: err => {
        console.error('获取新鲜出炉商品失败:', err);
        this.useTestData('isNew');
      }
    });
  },
  
  // 获取人气推荐商品
  getPopularProducts() {
    console.log('开始获取人气推荐商品');
    
    wx.cloud.callFunction({
      name: 'getproducts',
      data: {
        isHot: true,
        pageSize: 5,
        onlyActive: true
      },
      success: res => {
        console.log('获取人气推荐商品结果:', res);
        
        if (res.result && res.result.success && res.result.data && res.result.data.length > 0) {
          // 处理图片URL
          this.processProductImages(res.result.data, 'popularProducts');
        } else {
          console.warn('未获取到人气商品数据，使用测试数据');
          this.useTestData('isHot');
        }
      },
      fail: err => {
        console.error('获取人气推荐商品失败:', err);
        this.useTestData('isHot');
      }
    });
  },
  
  // 处理商品图片URL
  processProductImages(products, dataKey) {
    console.log(`处理${dataKey}的图片URL`);
    
    // 收集需要获取临时URL的云存储图片
    const cloudFileIDs = [];
    products.forEach(product => {
      if (product.image && product.image.startsWith('cloud://')) {
        cloudFileIDs.push(product.image);
      }
    });
    
    if (cloudFileIDs.length > 0) {
      // 有云存储图片，获取临时URL
      wx.cloud.getTempFileURL({
        fileList: cloudFileIDs,
        success: res => {
          console.log('获取临时文件URL成功:', res);
          
          // 创建ID到URL的映射
          const urlMap = {};
          if (res.fileList) {
            res.fileList.forEach(item => {
              if (item.fileID && item.tempFileURL) {
                urlMap[item.fileID] = item.tempFileURL;
              }
            });
          }
          
          // 更新商品图片URL
          const processedProducts = products.map(product => {
            if (product.image && product.image.startsWith('cloud://')) {
              if (urlMap[product.image]) {
                // 有临时URL，使用临时URL
                return { ...product, image: urlMap[product.image] };
              }
            }
            return product;
          });
          
          // 更新数据
          this.setData({
            [dataKey]: processedProducts,
            loading: false
          });
        },
        fail: err => {
          console.error('获取临时文件URL失败:', err);
          // 即使失败也更新数据
          this.setData({
            [dataKey]: products,
            loading: false
          });
        }
      });
    } else {
      // 没有云存储图片，直接更新数据
      this.setData({
        [dataKey]: products,
        loading: false
      });
    }
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
        price: 68,
        category: '蛋糕',
        rating: 4.9,
        reviews: 324,
        stock: 100,
        sales: 320
      },
      {
        _id: 'test2',
        name: '芒果千层',
        image: '/assets/images/products/product-mango-layer.jpg',
        price: 148,
        category: '蛋糕',
        rating: 4.8,
        reviews: 256,
        stock: 80,
        sales: 256
      },
      {
        _id: 'test3',
        name: '草莓蛋糕',
        image: '/assets/images/products/product-strawberry-cake.jpg',
        price: 98,
        category: '蛋糕',
        rating: 4.7,
        reviews: 190,
        stock: 90,
        sales: 190
      },
      {
        _id: 'test4',
        name: '法式面包',
        image: '/assets/images/products/product-french-bread.jpg',
        price: 28,
        category: '面包',
        rating: 4.6,
        reviews: 420,
        stock: 150,
        sales: 420
      },
      {
        _id: 'test5',
        name: '全麦面包',
        image: '/assets/images/products/product-wheat-bread.jpg',
        price: 32,
        category: '面包',
        rating: 4.5,
        reviews: 280,
        stock: 120,
        sales: 280
      }
    ];
    
    if (type === 'isNew') {
      this.setData({
        freshProducts: testData.slice(0, 3), // 只显示前3个商品作为新品
        loading: false
      });
    } else {
      // 人气推荐显示其他商品
      this.setData({
        popularProducts: testData.slice(3, 5),
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
          // 更新购物车数量
          getApp().updateCart();
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