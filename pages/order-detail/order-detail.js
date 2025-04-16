Page({
  /**
   * 页面的初始数据
   */
  data: {
    orderInfo: {
      id: '202312051234',
      status: 'delivering', // 订单状态：confirmed, baking, delivering, delivered
      statusText: '配送中',
      statusDesc: '您的订单已在配送中，预计18:45送达',
      progress: [
        {
          title: '订单已确认',
          time: '12月3日 14:30',
          status: 'completed'
        },
        {
          title: '烘焙中',
          time: '12月5日 16:15',
          status: 'completed'
        },
        {
          title: '配送中',
          time: '12月5日 17:20',
          delivery: '配送员: 王师傅 (134****1234)',
          status: 'active'
        },
        {
          title: '已送达',
          desc: '配送完成，感谢您的订购',
          waitDesc: '等待送达',
          status: 'waiting'
        }
      ],
      recipient: {
        name: '张伟',
        phone: '138****5678',
        address: '宁波江北洪大厦506'
      },
      products: [
        {
          id: 1,
          name: '法式牛角面包',
          image: '/assets/images/products/product-croissant.jpg',
          desc: '原味 · 轻烤烘烤 · 简易包装',
          price: '24.00',
          quantity: 2
        },
        {
          id: 2,
          name: '抹茶红豆蛋糕',
          image: '/assets/images/products/product-matcha-cake.jpg',
          desc: '标准甜度 · 小杯装',
          price: '28.00',
          quantity: 1
        },
        {
          id: 3,
          name: '经典提拉米苏',
          image: '/assets/images/products/product-tiramisu.jpg',
          desc: '标准甜度 · 小杯装',
          price: '38.00',
          quantity: 1
        }
      ],
      orderDetail: {
        orderNumber: '202312051234',
        orderTime: '2023-12-05 14:26:31',
        paymentMethod: '微信支付',
        deliveryTime: '今日 18:00-19:00',
        remark: '请放在门卫处，谢谢'
      },
      amount: {
        productTotal: '90.00',
        deliveryFee: '8.00',
        discount: '10.00',
        total: '88.00'
      }
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 根据options.id获取订单详情
    const orderId = options.id || '202312051234';
    this.getOrderDetail(orderId);
  },

  /**
   * 获取订单详情
   */
  getOrderDetail: function (orderId) {
    // 实际项目中，这里应该调用API获取订单详情
    // 示例中使用模拟数据
    console.log('获取订单详情，订单ID:', orderId);
    
    // 如果是从个人中心页面跳转过来的订单
    if (orderId === '202312051234S') {
      // 更新订单编号
      const orderInfo = this.data.orderInfo;
      orderInfo.id = orderId;
      orderInfo.orderDetail.orderNumber = orderId;
      this.setData({ orderInfo });
    }
    
    // 如果需要从服务器获取数据，可以使用wx.request
    // wx.request({
    //   url: 'https://api.example.com/orders/' + orderId,
    //   success: (res) => {
    //     this.setData({
    //       orderInfo: res.data
    //     });
    //   }
    // });
  },

  /**
   * 复制订单号
   */
  copyOrderNumber: function () {
    wx.setClipboardData({
      data: this.data.orderInfo.orderDetail.orderNumber,
      success: function () {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 联系客服
   */
  contactService: function () {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567', // 客服电话
      fail: function () {
        wx.showToast({
          title: '拨打电话失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 再来一单
   */
  reorder: function () {
    // 跳转到购物车页面，并添加商品
    const products = this.data.orderInfo.products;
    const cart = products.map(item => ({
      id: item.id,
      quantity: item.quantity
    }));
    
    // 将商品信息存入缓存
    wx.setStorageSync('reorderCart', cart);
    
    // 跳转到购物车页面
    wx.switchTab({
      url: '/pages/cart/cart',
      success: function () {
        wx.showToast({
          title: '已添加到购物车',
          icon: 'success'
        });
      }
    });
  }
}) 