// pages/profile/profile.js
const app = getApp();
const { orderApi } = require('../../utils/cloudApi');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false,
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
      toDeliver: 0,
      completed: 0
    },
    recentOrders: [],
    isLoading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.checkLoginStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.checkLoginStatus();
    if (app.globalData.isLogin) {
      this.getOrderList();
      
      // 检查是否需要跳转到订单列表
      try {
        const goToOrderList = wx.getStorageSync('goToOrderList');
        if (goToOrderList) {
          // 清除标记
          wx.removeStorageSync('goToOrderList');
          
          // 跳转到订单列表页
          console.log('检测到下单成功标记，自动跳转到订单列表');
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/order-package/orders'
            });
          }, 100);
        }
      } catch (e) {
        console.error('检查跳转标记失败', e);
      }
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function() {
    const isLogin = app.globalData.isLogin || false;
    
    this.setData({ isLogin });
    
    if (isLogin && app.globalData.userInfo) {
      this.setData({
        userInfo: {
          avatarUrl: app.globalData.userInfo.avatar || '../../assets/images/icons/user-active.png',
          nickName: app.globalData.userInfo.nickname || '微信用户',
          phone: app.globalData.userInfo.phone || '未绑定手机号'
        }
      });
    }
  },

  /**
   * 获取订单列表
   */
  getOrderList: function() {
    if (!app.globalData.isLogin) {
      return;
    }

    this.setData({ isLoading: true });
    
    wx.showLoading({
      title: '加载中',
    });
    
    orderApi.getOrders()
      .then(res => {
        console.log('获取订单列表成功', res);
        if (res && res.success && res.data && res.data.orders) {
          const orders = res.data.orders;
          
          // 统计各状态订单数量
          const orderStats = {
            toPay: 0,
            toBake: 0,
            toDeliver: 0,
            completed: 0
          };
          
          orders.forEach(order => {
            switch(order.status) {
              case 'pending':
                orderStats.toPay++;
                break;
              case 'paid':
                orderStats.toBake++;
                break;
              case 'processing':
                orderStats.toBake++;
                break;
              case 'delivering':
                orderStats.toDeliver++;
                break;
              case 'completed':
                orderStats.completed++;
                break;
            }
          });
          
          // 格式化最近订单数据
          const recentOrders = orders.slice(0, 3).map(order => {
            // 获取订单商品的图片
            const products = order.products.map(product => ({
              id: product.productId,
              image: product.image || '../../assets/images/products/default.png',
              count: product.quantity
            }));
            
            // 计算商品总数
            const totalCount = order.products.reduce((sum, product) => sum + product.quantity, 0);
            
            // 状态文本映射
            const statusTextMap = {
              'pending': '待付款',
              'paid': '已付款',
              'processing': '制作中',
              'delivering': '配送中',
              'completed': '已完成',
              'cancelled': '已取消'
            };
            
            return {
              id: order._id,
              status: order.status,
              statusText: statusTextMap[order.status] || order.statusText,
              products: products,
              totalCount: totalCount,
              totalPrice: order.totalAmount.toFixed(2),
              createTime: order.createTime
            };
          });
          
          this.setData({
            orderStats,
            recentOrders
          });
        } else {
          console.error('获取订单数据格式错误', res);
        }
      })
      .catch(err => {
        console.error('获取订单列表失败', err);
      })
      .finally(() => {
        this.setData({ isLoading: false });
        wx.hideLoading();
      });
  },

  /**
   * 跳转到登录页面
   */
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  /**
   * 退出登录
   */
  logout: function() {
    wx.showModal({
      title: '确认退出登录',
      content: '是否确认退出登录？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          app.globalData.isLogin = false;
          app.globalData.userInfo = null;
          
          // 更新页面状态
          this.setData({
            isLogin: false,
            userInfo: {
              avatarUrl: '../../assets/images/icons/user-active.png',
              nickName: '点击登录',
              phone: '登录后查看'
            },
            recentOrders: [] // 清空订单数据
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 获取用户数据
   */
  getUserData: function() {
    if (!app.globalData.isLogin) {
      return;
    }
    
    wx.showLoading({
      title: '加载中',
    });
    
    // 获取订单数据
    this.getOrderList();
    
    wx.hideLoading();
  },

  /**
   * 跳转到订单
   */
  goToOrders: function(e) {
    if(!getApp().globalData.isLogin) {
      this.showLoginDialog();
      return;
    }
    
    const status = e.currentTarget.dataset.status || '';
    wx.navigateTo({
      url: '/pages/order-package/orders?status=' + status
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
   * 查看订单详情
   */
  goToOrderDetail: function(e) {
    if(!getApp().globalData.isLogin) {
      this.showLoginDialog();
      return;
    }
    
    const id = e.currentTarget.dataset.id;
    if(!id) {
      console.error('缺少订单ID');
      return;
    }
    
    console.log('跳转到订单详情:', id);
    wx.navigateTo({
      url: '/pages/order-package/order-detail?id=' + id
    });
  },

  /**
   * 查看全部订单
   */
  goToOrdersList: function() {
    if(!getApp().globalData.isLogin) {
      this.showLoginDialog();
      return;
    }
    
    wx.navigateTo({
      url: '/pages/order-package/orders'
    });
  },

  /**
   * 显示功能开发中提示
   */
  showDevelopingToast: function() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none',
      duration: 2000
    });
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
      title: '梧桐小姐烘焙屋 - 甜蜜生活的小确幸',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share/profile-share.jpg'
    }
  }
}) 