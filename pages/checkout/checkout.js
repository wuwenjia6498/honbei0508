// pages/checkout/checkout.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 配送地址
    address: {
      name: '张伟',
      phone: '138****5678',
      address: '宁波江北外滩大厦506'
    },
    // 配送时间
    deliveryTime: '今日 18:00-19:00',
    // 通知信息
    notification: '今日供货商品将于您选择的时间内内新鲜烘焙，保证最佳口感。21:00以下单可当日配送。',
    // 订单商品
    orderItems: [
      {
        id: 1,
        name: '法式牛角面包',
        image: '/assets/images/products/product-croissant.jpg',
        price: 24.00,
        count: 2,
        specs: '标准烘焙・简易包装'
      },
      {
        id: 2,
        name: '抹茶红豆蛋糕',
        image: '/assets/images/products/product-matcha-cake.jpg',
        price: 28.00,
        count: 1,
        specs: '标准烘焙・小件装'
      },
      {
        id: 3,
        name: '经典提拉米苏',
        image: '/assets/images/products/product-tiramisu.jpg',
        price: 38.00,
        count: 1,
        specs: '标准烘焙・小盒装'
      }
    ],
    // 支付方式
    paymentMethods: [
      { id: 'wechat', name: '微信支付', icon: 'wechat', selected: true },
      { id: 'alipay', name: '支付宝', icon: 'alipay', selected: false },
      { id: 'cod', name: '货到付款', icon: 'cash', selected: false }
    ],
    // 订单金额
    orderAmount: {
      goodsTotal: 90.00,
      delivery: 8.00,
      discount: 10.00,
      total: 88.00
    }
  },

  /**
   * 返回上一页
   */
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 选择支付方式
   */
  selectPayment: function(e) {
    const id = e.currentTarget.dataset.id;
    const paymentMethods = this.data.paymentMethods.map(item => {
      return {
        ...item,
        selected: item.id === id
      };
    });
    this.setData({ paymentMethods });
  },

  /**
   * 确认支付
   */
  confirmPayment: function() {
    wx.showToast({
      title: '支付成功',
      icon: 'success',
      duration: 2000,
      success: function() {
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/index/index'
          });
        }, 2000);
      }
    });
  },

  /**
   * 跳转到地址选择页面
   */
  navigateToAddress: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 跳转到时间选择页面
   */
  selectDeliveryTime: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
}) 