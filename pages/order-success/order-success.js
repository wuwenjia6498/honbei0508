// pages/order-success/order-success.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    loaded: false,
    orderInfo: null,
    orderNo: '',
    paymentAmount: '',
    paymentMethod: '微信支付',
    estimatedDelivery: '3-5个工作日内'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (options.orderNo) {
      this.setData({
        orderNo: options.orderNo
      });
      this.loadOrderInfo(options.orderNo);
    } else {
      wx.showToast({
        title: '订单信息不完整',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载订单信息
   */
  loadOrderInfo: function (orderNo) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    // 检查用户是否登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo._id) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login',
        });
      }, 1500);
      return;
    }

    // 调用云函数获取订单信息
    wx.cloud.callFunction({
      name: 'getOrderDetail',
      data: {
        orderNo: orderNo
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        const orderInfo = res.result.data;
        this.setData({
          loaded: true,
          orderInfo: orderInfo,
          paymentAmount: orderInfo.totalAmount ? orderInfo.totalAmount.toFixed(2) : '0.00',
          paymentMethod: orderInfo.paymentMethod || '微信支付',
          estimatedDelivery: orderInfo.estimatedDelivery || '3-5个工作日内'
        });
      } else {
        wx.showToast({
          title: res.result.message || '获取订单信息失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('[订单详情]', err);
      wx.hideLoading();
      wx.showToast({
        title: '获取订单信息失败',
        icon: 'none'
      });
    });
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail: function() {
    if (this.data.orderNo) {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?orderNo=${this.data.orderNo}`
      });
    }
  },

  /**
   * 查看全部订单
   */
  viewAllOrders: function() {
    wx.navigateTo({
      url: '/pages/order/order-list'
    });
  },

  /**
   * 返回首页
   */
  backToHome: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 分享订单
   */
  onShareAppMessage: function() {
    return {
      title: '我在鲸鱼喵购物小程序完成了一笔订单',
      path: '/pages/index/index',
      imageUrl: '/images/share-image.png'
    };
  }
}) 