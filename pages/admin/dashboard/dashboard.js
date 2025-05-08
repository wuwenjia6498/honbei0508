// 管理员仪表盘页面
Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentDate: '2023年5月15日',
    statusBarHeight: 20,
    stats: {
      monthlyRevenue: 0,
      weeklyRevenue: 0,
      monthlySales: 0,
      inventory: 0
    },
    recentOrders: [],
    loading: true,
    statsLoading: true,
    ordersLoading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setCurrentDate();
    this.getStatusBarHeight();
    
    // 禁用系统导航条，使用自定义导航
    wx.hideTabBar();
    
    // 加载统计数据
    this.loadDashboardData();
  },

  /**
   * 获取状态栏高度
   */
  getStatusBarHeight: function() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 20;
      
      this.setData({
        statusBarHeight: statusBarHeight
      });
    } catch (e) {
      console.error('获取状态栏高度失败', e);
    }
  },

  /**
   * 设置当前日期
   */
  setCurrentDate: function () {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const formattedDate = `${year}年${month}月${day}日`;
    this.setData({
      currentDate: formattedDate
    });
  },

  /**
   * 加载控制台数据
   */
  loadDashboardData: function() {
    this.setData({
      loading: true,
      statsLoading: true,
      ordersLoading: true
    });
    
    // 并行加载统计数据和最近订单
    Promise.all([
      this.loadDashboardStats(),
      this.loadRecentOrders()
    ])
    .then(() => {
      this.setData({ loading: false });
    })
    .catch(error => {
      console.error('加载控制台数据失败', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  /**
   * 加载控制台统计数据
   */
  loadDashboardStats: function() {
    return new Promise((resolve, reject) => {
      // 记录调用参数
      const params = {
        action: 'getDashboardStats'
      };
      console.log('调用getDashboardStats云函数，参数:', params);
      
      wx.cloud.callFunction({
        name: 'userService',
        data: params
      })
      .then(res => {
        console.log('控制台统计数据:', res);
        if (res.result && res.result.success) {
          this.setData({
            stats: res.result.data,
            statsLoading: false
          });
          resolve(res.result.data);
        } else {
          console.error('获取统计数据失败，返回结果:', res.result);
          
          // 使用默认值
          this.setData({
            stats: {
              monthlyRevenue: 0,
              weeklyRevenue: 0,
              monthlySales: 0,
              inventory: 0
            },
            statsLoading: false
          });
          
          // 如果是权限问题，尝试检查管理员状态
          if (res.result && res.result.message === '权限不足') {
            this.checkAdminStatus();
          }
          
          throw new Error(res.result?.message || '获取统计数据失败');
        }
      })
      .catch(error => {
        console.error('获取统计数据失败:', error);
        this.setData({ statsLoading: false });
        
        // 如果无法获取数据，使用默认值
        this.setData({
          stats: {
            monthlyRevenue: 0,
            weeklyRevenue: 0,
            monthlySales: 0,
            inventory: 0
          }
        });
        
        // 显示错误提示
        wx.showToast({
          title: '获取统计数据失败',
          icon: 'none'
        });
        
        reject(error);
      });
    });
  },

  /**
   * 加载最近订单
   */
  loadRecentOrders: function() {
    return new Promise((resolve, reject) => {
      // 记录调用参数
      const params = {
        action: 'getRecentOrders',
        limit: 5 // 获取最近5条订单
      };
      console.log('调用getRecentOrders云函数，参数:', params);
      
      wx.cloud.callFunction({
        name: 'userService',
        data: params
      })
      .then(res => {
        console.log('最近订单数据:', res);
        if (res.result && res.result.success) {
          this.setData({
            recentOrders: res.result.data,
            ordersLoading: false
          });
          resolve(res.result.data);
        } else {
          console.error('获取最近订单失败，返回结果:', res.result);
          
          // 使用空数组
          this.setData({
            recentOrders: [],
            ordersLoading: false
          });
          
          // 如果是权限问题，尝试检查管理员状态
          if (res.result && res.result.message === '权限不足') {
            this.checkAdminStatus();
          }
          
          throw new Error(res.result?.message || '获取最近订单失败');
        }
      })
      .catch(error => {
        console.error('获取最近订单失败:', error);
        this.setData({ ordersLoading: false });
        
        // 如果无法获取数据，使用空数组
        this.setData({
          recentOrders: []
        });
        
        // 显示错误提示
        wx.showToast({
          title: '获取订单数据失败',
          icon: 'none'
        });
        
        reject(error);
      });
    });
  },

  /**
   * 检查管理员状态并设置
   */
  checkAdminStatus: function() {
    console.log('检查当前用户的管理员状态');
    wx.cloud.callFunction({
      name: 'userService',
      data: {
        action: 'isAdmin'
      }
    })
    .then(res => {
      console.log('管理员状态检查结果:', res);
      if (res.result && res.result.success) {
        const isAdmin = res.result.data.isAdmin;
        if (isAdmin) {
          console.log('当前用户是管理员');
          // 刷新数据
          setTimeout(() => {
            this.loadDashboardData();
          }, 1000);
        } else {
          console.log('当前用户不是管理员');
          wx.showModal({
            title: '权限提示',
            content: '您尚未获得管理员权限，是否申请成为管理员？',
            success: (res) => {
              if (res.confirm) {
                this.applyForAdminRole();
              }
            }
          });
        }
      }
    })
    .catch(error => {
      console.error('检查管理员状态失败:', error);
    });
  },
  
  /**
   * 申请管理员角色
   */
  applyForAdminRole: function() {
    wx.showLoading({
      title: '申请中...',
    });
    
    // 调用云函数将当前用户设置为管理员
    wx.cloud.callFunction({
      name: 'userService',
      data: {
        action: 'setAsAdmin'
      }
    })
    .then(res => {
      wx.hideLoading();
      console.log('设置管理员结果:', res);
      
      if (res.result && res.result.success) {
        wx.showModal({
          title: '申请成功',
          content: '您已被设置为管理员，请刷新页面查看数据。',
          showCancel: false,
          success: () => {
            this.loadDashboardData();
          }
        });
      } else {
        wx.showModal({
          title: '申请失败',
          content: res.result?.message || '设置管理员失败，请稍后再试',
          showCancel: false
        });
      }
    })
    .catch(error => {
      wx.hideLoading();
      console.error('设置管理员失败:', error);
      wx.showModal({
        title: '申请失败',
        content: '设置管理员失败，请稍后再试',
        showCancel: false
      });
    });
  },

  /**
   * 返回用户界面
   */
  backToUserInterface: function() {
    wx.showModal({
      title: '返回用户界面',
      content: '确定要返回普通用户界面吗？',
      success: (res) => {
        if (res.confirm) {
          // 返回到用户首页
          wx.reLaunch({
            url: '/pages/index/index',
            success: function() {
              wx.showToast({
                title: '已切换到用户模式',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 查看所有订单
   */
  viewAllOrders: function () {
    wx.redirectTo({
      url: '/pages/admin/orders/orders',
    });
  },

  /**
   * 导航到数据初始化工具页面
   */
  navigateToDataInit: function() {
    wx.navigateTo({
      url: '/pages/admin/dataInit/dataInit',
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function() {
    this.loadDashboardData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时更新日期
    this.setCurrentDate();
    
    // 确保每次页面显示时系统导航栏都是隐藏的
    wx.hideTabBar();
    
    // 每次页面显示时刷新数据
    this.loadDashboardData();
  }
}); 