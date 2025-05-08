// app.js

// 导入云函数API封装模块
const cloudAPI = require('./utils/cloudApi');

// 收藏到我的小程序，统一URL信息
wx.setStorageSync('launchInfo', {
  path: 'pages/index/index',
  query: {}
});

App({
  // 全局数据，提前初始化
  globalData: {
    userInfo: null,
    openid: null,
    isLogin: false,
    debug: true, // 开启调试模式以便查看更多日志
    systemInfo: null,
    isIphoneX: false,
    cartList: [],
    cartTotal: 0,
    addressListNeedRefresh: false,
    selectedAddressId: null,
    needRefresh: false,
    cloudApi: cloudAPI  // 添加cloudApi到全局数据
  },

  onLaunch: function () {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      wx.showModal({
        title: '初始化失败',
        content: '请使用 2.2.3 或以上的基础库以使用云能力',
        showCancel: false
      })
      return
    }

    try {
      // 确保指定正确的环境ID
      wx.cloud.init({
        env: 'cloud1-3g9nsaj9f3a1b0ed',
        traceUser: true,
      })
      console.log('云环境初始化完成，当前环境ID: cloud1-3g9nsaj9f3a1b0ed')
      
      // 测试云环境连接
      wx.cloud.callFunction({
        name: 'getCategories',
        data: { onlyActive: true }
      }).then(res => {
        console.log('云环境连接测试成功:', res)
        if (!res.result) {
          console.error('云函数返回数据为空')
          wx.showModal({
            title: '初始化提示',
            content: '数据库可能未初始化，是否现在初始化数据？',
            success: (res) => {
              if (res.confirm) {
                this.initCloudData()
              }
            }
          })
        }
      }).catch(err => {
        console.error('云环境连接测试失败:', err)
        wx.showModal({
          title: '连接失败',
          content: '云环境连接测试失败，请检查云函数是否已部署，错误信息：' + (err.errMsg || JSON.stringify(err)),
          showCancel: false
        })
      })
    } catch (err) {
      console.error('云环境初始化失败:', err)
      wx.showModal({
        title: '初始化失败',
        content: '云环境初始化失败，请检查环境ID是否正确。错误信息：' + (err.errMsg || JSON.stringify(err)),
        showCancel: false
      })
    }

    // 获取设备信息
    this.getSystemInfo();

    // 尝试恢复用户登录状态
    this.tryResumeUserLogin();

    // 设置购物车徽标
    this.updateCartBadge();

    // 获取用户openid
    this.getOpenid()
  },

  // 获取用户openid
  getOpenid: function() {
    let that = this
    wx.cloud.callFunction({
      name: 'userService',
      data: {
        action: 'getOpenid'
      },
      success: res => {
        console.log('获取openid成功', res)
        if (res.result && res.result.success) {
          that.globalData.openid = res.result.data.openid
          
          // 检查用户是否已注册
          that.checkUserRegistered(res.result.data.openid)
        }
      },
      fail: err => {
        console.error('获取openid失败', err)
      }
    })
  },

  // 检查用户是否已注册
  checkUserRegistered: function(openid) {
    let that = this
    wx.cloud.callFunction({
      name: 'userService',
      data: {
        action: 'getUserInfo'
      },
      success: res => {
        console.log('获取用户信息成功', res)
        if (res.result && res.result.success && res.result.data) {
          that.globalData.userInfo = res.result.data
          that.globalData.isLogin = true
        }
      },
      fail: err => {
        console.error('获取用户信息失败', err)
      }
    })
  },

  // 初始化云数据库数据
  initCloudData: function(callback) {
    wx.showLoading({
      title: '初始化数据中...',
    });

    console.log('正在调用initData云函数...');
    wx.cloud.callFunction({
      name: 'initData',
      data: {
        action: 'initAll'
      }
    }).then(res => {
      wx.hideLoading();
      console.log('初始化数据结果:', res);
      if (res.result && res.result.success) {
        wx.showToast({
          title: '数据初始化成功',
          icon: 'success',
          duration: 2000
        });
        if (typeof callback === 'function') {
          callback(true);
        }
      } else {
        const errorMsg = res.result ? res.result.message || '未知错误' : '未知错误';
        console.error('初始化失败:', errorMsg);
        wx.showToast({
          title: '初始化失败',
          icon: 'none',
          duration: 2000
        });
        if (typeof callback === 'function') {
          callback(false);
        }
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('调用initData云函数失败:', err);
      wx.showToast({
        title: '初始化失败',
        icon: 'none',
        duration: 2000
      });
      if (typeof callback === 'function') {
        callback(false);
      }
    });
  },

  // 清空云数据库数据
  clearCloudData: function(callback) {
    wx.showLoading({
      title: '清空数据中...',
    });

    wx.cloud.callFunction({
      name: 'initData',
      data: {
        action: 'clearAll'
      }
    }).then(res => {
      wx.hideLoading();
      console.log('清空数据成功', res);
      if (res.result && res.result.success) {
        wx.showToast({
          title: '数据已清空',
          icon: 'success',
          duration: 2000
        });
        if (typeof callback === 'function') {
          callback(true);
        }
      } else {
        wx.showToast({
          title: '清空数据失败',
          icon: 'none',
          duration: 2000
        });
        if (typeof callback === 'function') {
          callback(false);
        }
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('清空数据失败', err);
      wx.showToast({
        title: '清空数据失败',
        icon: 'none',
        duration: 2000
      });
      if (typeof callback === 'function') {
        callback(false);
      }
    });
  },

  // 获取系统信息
  getSystemInfo: function () {
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;

    // 判断是否为iPhoneX系列
    const model = systemInfo.model;
    this.globalData.isIphoneX = model.search(/iPhone X|iPhone 11|iPhone 12|iPhone 13|iPhone 14|iPhone 15/i) > -1;
  },

  // 尝试恢复用户登录状态
  tryResumeUserLogin: function () {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    
    if (userInfo && openid) {
      this.globalData.userInfo = userInfo;
      this.globalData.openid = openid;
      this.globalData.isLogin = true;
      
      // 更新购物车信息
      this.updateCart();
    }
  },

  // 更新购物车信息
  updateCart: function () {
    if (!this.globalData.isLogin) {
      this.updateCartBadge();
      return;
    }

    wx.cloud.callFunction({
      name: 'cartService',
      data: {
        action: 'getCart'
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        const cartList = res.result.data || [];
        this.globalData.cartList = cartList;
        this.globalData.cartTotal = cartList.reduce((total, item) => {
          return total + item.quantity;
        }, 0);
        
        this.updateCartBadge();
      }
    }).catch(err => {
      console.error('获取购物车失败', err);
    });
  },

  // 更新购物车图标上的数字
  updateCartBadge: function () {
    const total = this.globalData.cartTotal;
    if (total > 0) {
      wx.setTabBarBadge({
        index: 2, // 购物车的Tab索引
        text: total.toString()
      }).catch(e => {
        // 忽略可能的错误，例如Tab还未创建
      });
    } else {
      wx.removeTabBarBadge({
        index: 2
      }).catch(e => {
        // 忽略可能的错误
      });
    }
  },

  // 用户登录
  userLogin: function (userInfo) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'userService',
        data: {
          action: 'login',
          userInfo: userInfo
        }
      }).then(res => {
        console.log('用户登录结果', res);
        if (res.result && res.result.code === 0) {
          const userData = res.result.data;
          
          // 保存用户信息
          this.globalData.userInfo = userData.userInfo;
          this.globalData.openid = userData.openid;
          this.globalData.isLogin = true;
          
          // 缓存到本地
          wx.setStorageSync('userInfo', userData.userInfo);
          wx.setStorageSync('openid', userData.openid);
          
          // 更新购物车信息
          this.updateCart();
          
          resolve(userData);
        } else {
          reject(new Error(res.result?.message || '登录失败'));
        }
      }).catch(err => {
        console.error('登录失败', err);
        reject(err);
      });
    });
  },

  // 退出登录
  logout: function () {
    // 清除内存中的用户信息
    this.globalData.userInfo = null;
    this.globalData.openid = null;
    this.globalData.isLogin = false;
    this.globalData.cartList = [];
    this.globalData.cartTotal = 0;
    
    // 清除本地存储
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
    wx.removeStorageSync('selectedAddress');
    
    // 更新购物车徽标
    this.updateCartBadge();
  }
})
