// pages/category/category.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 'all',
    productList: [
      {
        id: 1,
        name: '法式牛角面包',
        image: '/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg',
        rating: 4.9,
        reviewCount: 128,
        price: 12
      },
      {
        id: 2,
        name: '全麦吐司',
        image: '/assets/images/products/photo-1499636136210-6f4ee915583e.jpeg',
        rating: 4.7,
        reviewCount: 96,
        price: 18
      },
      {
        id: 3,
        name: '抹茶红豆蛋糕',
        image: '/assets/images/products/product-matcha-cake.jpg',
        rating: 4.8,
        reviewCount: 118,
        price: 28
      },
      {
        id: 4,
        name: '芒果千层蛋糕',
        image: '/assets/images/products/product-mango-layer.jpg',
        rating: 4.8,
        reviewCount: 156,
        price: 45
      },
      {
        id: 5,
        name: '什锦曲奇',
        image: '/assets/images/products/product-brownie.jpg',
        rating: 4.6,
        reviewCount: 89,
        price: 22
      },
      {
        id: 6,
        name: '巧克力布朗尼',
        image: '/assets/images/products/product-croissant.jpg',
        rating: 4.7,
        reviewCount: 112,
        price: 32
      }
    ],
    categories: [
      { id: 'bread', name: '面包', count: 20 },
      { id: 'cake', name: '蛋糕', count: 15 },
      { id: 'cookie', name: '饼干', count: 12 },
      { id: 'dessert', name: '甜点', count: 18 }
    ]
  },

  /**
   * 切换分类标签
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
    
    // 在实际应用中，这里应该根据选中的标签请求对应的商品数据
    // 这里为了演示，我们不做实际的数据请求
    console.log(`切换到标签: ${tab}`);
  },

  /**
   * 点击商品进入详情页
   */
  navigateToDetail(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    });
  },
  
  /**
   * 添加到购物车
   */
  addToCart(e) {
    const productId = e.currentTarget.dataset.id;
    // 这里应该调用购物车相关的逻辑
    console.log(`添加商品到购物车: ${productId}`);
    
    wx.showToast({
      title: '已添加到购物车',
      icon: 'success',
      duration: 2000
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 页面加载时，可以从服务器获取分类数据和商品数据
    // 这里为了演示，我们使用预设的数据
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    // 下拉刷新时，可以重新获取商品数据
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    // 上拉加载更多商品
    console.log('加载更多商品');
  }
}) 