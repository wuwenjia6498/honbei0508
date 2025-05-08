const { orderApi } = require('../../utils/cloudApi');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    orderId: '',
    orderInfo: null,
    isLoading: true,
    fromOrderList: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 设置正确的页面返回行为
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      // 检查上一个页面是否是订单列表页
      if (prevPage.route === 'pages/orders/orders') {
        // 是订单列表页，无需特殊处理，使用默认返回按钮
        console.log('上一页是订单列表页，使用默认返回按钮');
        this.setData({
          fromOrderList: true
        });
      } else {
        // 上一页不是订单列表页，需要手动设置返回到订单列表页
        console.log('上一页不是订单列表页，需要手动导航');
        this.setData({
          fromOrderList: false
        });
      }
    }
    
    // 根据options.id获取订单详情
    const orderId = options.id || '';
    this.setData({ orderId });
    
    if (orderId) {
      this.getOrderDetail(orderId);
    } else if (options.status) {
      // 如果是按状态查看，调转到订单列表页并传递状态参数
      this.navigateToOrderList(options.status);
    } else {
      // 没有orderId也没有status，跳转到订单列表页
      this.navigateToOrderList();
    }
  },

  /**
   * 返回订单列表页
   */
  backToOrderList: function() {
    console.log('返回按钮被点击');
    
    const pages = getCurrentPages();
    console.log('当前页面栈:', pages.map(p => p.route));
    
    // 检查页面栈是否至少有两个页面
    if (pages.length > 1) {
      // 获取上一个页面的路由
      const prevPage = pages[pages.length - 2];
      console.log('上一页面路由:', prevPage.route);
      
      // 检查上一页是否是管理员页面
      if (prevPage.route && prevPage.route.includes('/admin/')) {
        console.log('上一页是管理员页面，跳转到用户订单列表');
        wx.redirectTo({
          url: '/pages/orders/orders'
        });
        return;
      }
      
      // 正常返回上一页
      wx.navigateBack();
    } else {
      // 没有上一页，返回到订单列表页
      wx.redirectTo({
        url: '/pages/orders/orders'
      });
    }
  },

  /**
   * 监听页面显示
   */
  onShow: function() {
    // 确保返回按钮行为正确
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#a68a7b'
    });
  },

  /**
   * 跳转到订单列表页
   */
  navigateToOrderList: function(status = '') {
    wx.redirectTo({
      url: '/pages/orders/orders' + (status ? '?status=' + status : '')
    });
  },

  /**
   * 获取订单详情
   */
  getOrderDetail: function (orderId) {
    this.setData({ isLoading: true });
    
    wx.showLoading({
      title: '加载中',
    });
    
    orderApi.getOrderDetail(orderId)
      .then(res => {
        console.log('获取订单详情成功', res);
        if (res && res.success && res.data) {
          const orderData = res.data;
          
          // 状态文本映射
          const statusTextMap = {
            'pending': '待付款',
            'paid': '已付款',
            'processing': '制作中',
            'delivering': '配送中',
            'completed': '已完成',
            'cancelled': '已取消'
          };
          
          // 状态描述映射
          const statusDescMap = {
            'pending': '请尽快完成支付',
            'paid': '我们已收到您的付款，即将开始制作',
            'processing': '您的订单正在制作中，请耐心等待',
            'delivering': '您的订单正在配送中，请保持电话畅通',
            'completed': '您的订单已完成，感谢您的惠顾',
            'cancelled': '您的订单已取消'
          };
          
          // 格式化订单信息
          const orderInfo = {
            id: orderData._id,
            status: orderData.status,
            statusText: statusTextMap[orderData.status] || orderData.statusText,
            statusDesc: statusDescMap[orderData.status] || '',
            progress: orderData.progress || [],
            recipient: {
              name: orderData.address.name,
              phone: orderData.address.phone,
              address: orderData.address.fullAddress || orderData.address.address
            },
            products: orderData.products.map(product => ({
              id: product.productId,
              name: product.name,
              image: product.image,
              desc: product.spec || '标准规格',
              price: product.price.toFixed(2),
              quantity: product.quantity
            })),
            orderDetail: {
              orderNumber: orderData.orderNumber,
              orderTime: this.formatDate(orderData.createTime),
              paymentMethod: orderData.paymentMethod === 'wechat' ? '微信支付' : 
                            (orderData.paymentMethod === 'alipay' ? '支付宝' : 
                            (orderData.paymentMethod === 'cod' ? '货到付款' : '未知')),
              deliveryTime: orderData.deliveryTime?.display || '尽快送达',
              remark: orderData.remarks || '无'
            },
            amount: {
              productTotal: orderData.totalAmount.toFixed(2),
              deliveryFee: '8.00', // 可能需要从订单数据中获取
              discount: '0.00',    // 可能需要从订单数据中获取
              total: orderData.totalAmount.toFixed(2) // 应该是最终支付金额
            }
          };
          
          this.setData({ orderInfo });
        } else {
          wx.showToast({
            title: '获取订单详情失败',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      })
      .catch(err => {
        console.error('获取订单详情失败', err);
        wx.showToast({
          title: '获取订单详情失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
        wx.hideLoading();
      });
  },

  /**
   * 格式化日期
   */
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },

  /**
   * 复制订单号
   */
  copyOrderNumber: function () {
    if (!this.data.orderInfo) return;
    
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
    if (!this.data.orderInfo) return;
    
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