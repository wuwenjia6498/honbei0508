Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    showListView: true,
    currentOrder: null,
    tabList: ['全部', '待发货', '配送中', '已完成'],
    orders: [],
    filteredOrders: [],
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadOrders();
  },

  /**
   * 加载订单数据
   */
  loadOrders: function () {
    // 模拟获取订单数据，实际项目中应从服务器获取
    const orders = [
      {
        id: 'ORD20240428001',
        status: 'pending',
        statusText: '待发货',
        createTime: '2024-04-28 12:30:45',
        products: [
          {
            id: 1,
            name: '有机草莓',
            spec: '500g/盒',
            price: 25.80,
            quantity: 2,
            image: '/images/product-1.png'
          },
          {
            id: 2,
            name: '新鲜蓝莓',
            spec: '125g/盒',
            price: 13.50,
            quantity: 1,
            image: '/images/product-2.png'
          }
        ],
        totalAmount: 65.10,
        address: {
          name: '张三',
          phone: '13812345678',
          detail: '北京市朝阳区望京SOHO T1 20层2008室'
        },
        paymentMethod: '微信支付',
        orderNumber: 'ORD20240428001',
        paymentTime: '2024-04-28 12:35:23',
        progress: [
          {
            title: '订单已完成支付',
            desc: '感谢您的购买',
            time: '2024-04-28 12:35:23',
            completed: true
          },
          {
            title: '订单正在处理中',
            desc: '我们正在为您准备商品',
            time: '2024-04-28 12:40:15',
            completed: true
          },
          {
            title: '等待商品出库',
            desc: '商品即将出库',
            time: null,
            completed: false
          }
        ]
      },
      {
        id: 'ORD20240427005',
        status: 'shipping',
        statusText: '配送中',
        createTime: '2024-04-27 15:45:32',
        products: [
          {
            id: 3,
            name: '进口牛油果',
            spec: '3个/份',
            price: 22.90,
            quantity: 1,
            image: '/images/product-3.png'
          }
        ],
        totalAmount: 22.90,
        address: {
          name: '李四',
          phone: '13987654321',
          detail: '上海市浦东新区张江高科技园区博云路2号'
        },
        paymentMethod: '支付宝',
        orderNumber: 'ORD20240427005',
        paymentTime: '2024-04-27 15:46:18',
        progress: [
          {
            title: '订单已完成支付',
            desc: '感谢您的购买',
            time: '2024-04-27 15:46:18',
            completed: true
          },
          {
            title: '订单已发货',
            desc: '商品已交付配送',
            time: '2024-04-27 16:30:45',
            completed: true
          },
          {
            title: '配送中',
            desc: '预计明天送达',
            time: '2024-04-27 16:35:22',
            completed: true
          },
          {
            title: '订单已完成',
            desc: '期待您的下次购买',
            time: null,
            completed: false
          }
        ]
      },
      {
        id: 'ORD20240425002',
        status: 'completed',
        statusText: '已完成',
        createTime: '2024-04-25 09:20:11',
        products: [
          {
            id: 4,
            name: '有机胡萝卜',
            spec: '400g/份',
            price: 8.50,
            quantity: 2,
            image: '/images/product-4.png'
          },
          {
            id: 5,
            name: '新鲜西兰花',
            spec: '300g/份',
            price: 10.80,
            quantity: 1,
            image: '/images/product-5.png'
          },
          {
            id: 6,
            name: '有机菠菜',
            spec: '250g/份',
            price: 7.90,
            quantity: 1,
            image: '/images/product-6.png'
          }
        ],
        totalAmount: 35.70,
        address: {
          name: '王五',
          phone: '13765432198',
          detail: '广州市天河区天河路385号太古汇北塔15层'
        },
        paymentMethod: '微信支付',
        orderNumber: 'ORD20240425002',
        paymentTime: '2024-04-25 09:21:05',
        progress: [
          {
            title: '订单已完成支付',
            desc: '感谢您的购买',
            time: '2024-04-25 09:21:05',
            completed: true
          },
          {
            title: '订单已发货',
            desc: '商品已交付配送',
            time: '2024-04-25 10:15:32',
            completed: true
          },
          {
            title: '配送中',
            desc: '预计今天下午送达',
            time: '2024-04-25 10:20:45',
            completed: true
          },
          {
            title: '订单已送达',
            desc: '订单已完成',
            time: '2024-04-25 15:30:12',
            completed: true
          }
        ]
      }
    ];

    setTimeout(() => {
      this.setData({
        orders: orders,
        filteredOrders: orders,
        loading: false
      });
    }, 500); // 模拟网络请求延迟
  },

  /**
   * 切换标签页
   */
  switchTab: function (e) {
    const tabIndex = e.currentTarget.dataset.index;
    this.setData({
      activeTab: tabIndex
    });
    this.filterOrdersByTab(tabIndex);
  },

  /**
   * 根据标签筛选订单
   */
  filterOrdersByTab: function (tabIndex) {
    const { orders } = this.data;
    let filteredOrders = [];

    switch (tabIndex) {
      case 0: // 全部
        filteredOrders = orders;
        break;
      case 1: // 待发货
        filteredOrders = orders.filter(order => order.status === 'pending');
        break;
      case 2: // 配送中
        filteredOrders = orders.filter(order => order.status === 'shipping');
        break;
      case 3: // 已完成
        filteredOrders = orders.filter(order => order.status === 'completed');
        break;
      default:
        filteredOrders = orders;
    }

    this.setData({
      filteredOrders: filteredOrders
    });
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail: function (e) {
    const orderId = e.currentTarget.dataset.id;
    const order = this.data.orders.find(item => item.id === orderId);
    
    if (order) {
      this.setData({
        currentOrder: order,
        showListView: false
      });
    }
  },

  /**
   * 返回订单列表
   */
  backToList: function () {
    this.setData({
      showListView: true,
      currentOrder: null
    });
  },

  /**
   * 复制文本
   */
  copyText: function (e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  /**
   * 联系客服
   */
  contactService: function () {
    wx.showToast({
      title: '正在连接客服...',
      icon: 'loading',
      duration: 1500
    });
    // 实际项目中可以跳转到客服会话
  },

  /**
   * 再次购买
   */
  rebuyOrder: function () {
    const order = this.data.currentOrder;
    
    wx.showModal({
      title: '再次购买',
      content: '是否将订单中的商品加入购物车？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已加入购物车',
            icon: 'success',
            duration: 1500
          });
          // 实际项目中应将商品添加到购物车
        }
      }
    });
  },

  /**
   * 底部导航栏页面跳转
   */
  navigateTo: function (e) {
    const url = e.currentTarget.dataset.url;
    // 判断是否为当前页面
    if (url === '/pages/admin/orders/orders') {
      return;
    }
    
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.log('导航失败，尝试重定向:', err);
        // 如果navigateTo失败，可能是已打开的页面，尝试使用redirectTo
        wx.redirectTo({
          url: url,
          fail: function(redirectErr) {
            console.log('重定向也失败了:', redirectErr);
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  /**
   * 计算商品总价
   */
  calculateProductTotal: function (product) {
    return (product.price * product.quantity).toFixed(2);
  },

  /**
   * 计算订单商品总额
   */
  calculateSubtotal: function (order) {
    if (!order || !order.products) return 0;
    return order.products.reduce((sum, product) => sum + product.price * product.quantity, 0).toFixed(2);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function () {
    if (this.data.showListView) {
      this.setData({
        loading: true
      });
      this.loadOrders();
      setTimeout(() => {
        wx.stopPullDownRefresh();
      }, 1000);
    } else {
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    if (this.data.showListView) {
      // 实际项目中可以加载更多订单
      wx.showToast({
        title: '没有更多订单了',
        icon: 'none'
      });
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '我的订单',
      path: '/pages/admin/orders/orders'
    };
  }
}) 