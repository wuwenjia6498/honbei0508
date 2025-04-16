// pages/profile/profile.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      avatarUrl: '../../assets/images/icons/user-active.png',
      nickName: '张伟',
      phone: '138****5678'
    },
    memberInfo: {
      level: '甜心会员',
      saved: 135
    },
    orderStats: {
      toPay: 0,
      toBake: 0,
      toDeliver: 2,
      completed: 0
    },
    recentOrders: [
      {
        id: '202312051234S',
        status: 'delivery',
        statusText: '配送中',
        products: [
          { 
            id: 1, 
            image: '../../assets/images/products/product-brownie.jpg',
            count: 2
          },
          { 
            id: 2, 
            image: '../../assets/images/products/product-tiramisu.jpg',
            count: 1
          },
          { 
            id: 3, 
            image: '../../assets/images/products/product-cream-puff.jpg',
            count: 1
          }
        ],
        totalCount: 4,
        totalPrice: 88.00
      },
      {
        id: '202312049876S',
        status: 'completed',
        statusText: '已完成',
        products: [
          { 
            id: 4, 
            image: '../../assets/images/products/product-croissant.jpg',
            count: 2
          },
          { 
            id: 5, 
            image: '../../assets/images/products/product-mango-layer.jpg',
            count: 3
          }
        ],
        totalCount: 5,
        totalPrice: 98.00
      }
    ],
    couponCount: 3
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 这里可以从服务器获取用户数据、订单数据等
    // 模拟从服务器获取数据
    this.getUserData();
  },

  /**
   * 获取用户数据（模拟）
   */
  getUserData: function() {
    // 实际应用中，这里应该是发送请求到服务器获取数据
    // 模拟数据请求延迟
    wx.showLoading({
      title: '加载中',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      // 如有需要可以在这里更新页面数据
    }, 500);
  },

  /**
   * 跳转到订单页面
   */
  goToOrders: function(e) {
    const status = e.currentTarget.dataset.status || '';
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?status=' + status
    });
  },

  /**
   * 跳转到会员详情页面
   */
  goToMemberDetail: function() {
    wx.navigateTo({
      url: '/pages/member/member'
    });
  },

  /**
   * 跳转到订单详情页面
   */
  goToOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?id=' + orderId
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次显示页面时，可以刷新数据
    this.getUserData();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    // 下拉刷新
    this.getUserData();
    wx.stopPullDownRefresh();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
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
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '梧桐小姐烘焙 - 甜蜜生活的小确幸',
      path: '/pages/index/index'
    };
  }
}) 