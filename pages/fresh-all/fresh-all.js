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
            
          this.setData({
            freshProducts: products,
            loading: false,
            isLoadingMore: false,
            totalPages: res.result.pagination ? res.result.pagination.pages : 1,
            noMoreData: this.data.pageNum >= (res.result.pagination ? res.result.pagination.pages : 1)
          })
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
  }
}) 