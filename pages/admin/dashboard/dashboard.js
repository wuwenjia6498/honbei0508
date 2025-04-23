// 管理员仪表盘页面
Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentDate: '2023年5月15日',
    statusBarHeight: 20,
    // 不再需要动态数据，使用与UI设计图匹配的静态数据
    // 后续可根据需要改为从服务器获取数据
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setCurrentDate();
    this.getStatusBarHeight();
    
    // 禁用系统导航条，使用自定义导航
    wx.hideTabBar();
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
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时更新日期
    this.setCurrentDate();
    
    // 确保每次页面显示时系统导航栏都是隐藏的
    wx.hideTabBar();
  }
}); 