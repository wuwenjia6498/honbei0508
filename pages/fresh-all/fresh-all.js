// fresh-all.js
const app = getApp()

Page({
  data: {
    freshProducts: [],
    loading: true,
    pageNum: 1,
    pageSize: 10,
    totalPages: 1,
    isLoadingMore: false,
    noMoreData: false
  },
  onLoad: function (options) {
    wx.setNavigationBarTitle({
      title: '今日新鲜出炉'
    });
    
    // 获取新鲜商品
    this.getFreshProducts()
  },
  
  // 获取新鲜出炉商品
  getFreshProducts(more = false) {
    if (more) {
      if (this.data.pageNum >= this.data.totalPages) {
        this.setData({
          noMoreData: true,
          isLoadingMore: false
        })
        return
      }
      
      this.setData({
        isLoadingMore: true,
        pageNum: this.data.pageNum + 1
      })
    } else {
      this.setData({
        loading: true,
        pageNum: 1,
        freshProducts: []
      })
    }
    
    wx.cloud.callFunction({
      name: 'getproducts',
      data: {
        isNew: true,
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      },
      success: res => {
        console.log('获取新鲜出炉商品成功', res)
        if (res.result && res.result.success) {
          const products = more ? 
            [...this.data.freshProducts, ...res.result.data] : 
            res.result.data
          
          // 处理图片URL  
          this.processProductImages(products)
          
          // 检查是否没有数据，如果没有数据，尝试初始化数据库
          if (!more && (!products || products.length === 0)) {
            console.log('没有获取到新鲜商品数据，尝试初始化数据库');
            this.initializeDatabaseIfEmpty();
          }
        }
      },
      fail: err => {
        console.error('获取新鲜出炉商品失败', err)
        this.setData({
          loading: false,
          isLoadingMore: false
        })
      }
    })
  },
  
  // 处理商品图片URL
  processProductImages(products) {
    console.log('处理商品图片URL');
    
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
            freshProducts: processedProducts,
            loading: false,
            isLoadingMore: false,
            totalPages: this.data.totalPages,
            noMoreData: this.data.pageNum >= this.data.totalPages
          });
        },
        fail: err => {
          console.error('获取临时文件URL失败:', err);
          // 即使失败也更新数据
          this.setData({
            freshProducts: products,
            loading: false,
            isLoadingMore: false,
            totalPages: this.data.totalPages,
            noMoreData: this.data.pageNum >= this.data.totalPages
          });
        }
      });
    } else {
      // 没有云存储图片，直接更新数据
      this.setData({
        freshProducts: products,
        loading: false,
        isLoadingMore: false,
        totalPages: this.data.totalPages,
        noMoreData: this.data.pageNum >= this.data.totalPages
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
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    // 查找商品
    const product = this.data.freshProducts.find(item => item._id === productId);
    
    // 如果找到商品，检查库存
    if (product) {
      // 检查库存是否足够
      const stock = product.stock !== undefined ? product.stock : 0;
      if (stock <= 0) {
        wx.showToast({
          title: '商品库存不足',
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
  
  // 下拉刷新
  onPullDownRefresh() {
    this.getFreshProducts()
    wx.stopPullDownRefresh()
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (!this.data.noMoreData && !this.data.isLoadingMore) {
      this.getFreshProducts(true)
    }
  },
  
  // 尝试初始化数据库（如果为空）
  initializeDatabaseIfEmpty() {
    console.log('尝试初始化数据库');
    
    wx.showModal({
      title: '提示',
      content: '没有获取到商品数据，是否初始化数据库？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'initData',
            data: {
              action: 'unifyInit'  // 使用统一初始化函数
            },
            success: res => {
              console.log('统一初始化数据库结果:', res);
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '数据初始化成功',
                  icon: 'success',
                  duration: 2000
                });
                
                // 数据初始化成功后，重新获取商品数据
                setTimeout(() => {
                  this.setData({
                    pageNum: 1,
                    freshProducts: []
                  });
                  this.getFreshProducts();
                }, 1000);
              } else {
                console.error('统一初始化数据失败，尝试使用cleanDatabase');
                // 如果统一初始化失败，回退到使用cleanDatabase
                this.fallbackToCleanDatabase();
              }
            },
            fail: err => {
              console.error('调用initData统一初始化云函数失败:', err);
              // 如果调用失败，回退到使用cleanDatabase
              this.fallbackToCleanDatabase();
            }
          });
        }
      }
    });
  },
  
  // 回退到使用cleanDatabase函数初始化
  fallbackToCleanDatabase() {
    console.log('回退到使用cleanDatabase初始化数据');
    
    wx.cloud.callFunction({
      name: 'cleanDatabase',
      data: {
        action: 'init'  // 初始化数据
      },
      success: res => {
        console.log('cleanDatabase初始化结果:', res);
        if (res.result && res.result.success) {
          wx.showToast({
            title: '数据初始化成功',
            icon: 'success',
            duration: 2000
          });
          
          // 数据初始化成功后，重新获取商品数据
          setTimeout(() => {
            this.setData({
              pageNum: 1,
              freshProducts: []
            });
            this.getFreshProducts();
          }, 1000);
        } else {
          console.error('所有初始化方法都失败');
          wx.showToast({
            title: '初始化失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: err => {
        console.error('调用cleanDatabase云函数失败:', err);
        wx.showToast({
          title: '初始化失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  }
}) 