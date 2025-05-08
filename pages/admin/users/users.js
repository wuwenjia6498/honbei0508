const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    title: '用户管理',
    activeTab: 0,
    tabs: [
      { id: 0, name: '全部用户', count: 0 },
      { id: 1, name: '普通会员', count: 0 },
      { id: 2, name: '高级会员', count: 0 },
      { id: 3, name: '非活跃用户', count: 0 }
    ],
    userList: [],
    loading: true,
    isLoading: false,
    showModal: false,
    currentUser: null,
    page: 1,
    pageSize: 10,
    hasMore: true,
    showEmpty: false,
    showUserDetail: false,
    operationType: '',
    actionUser: null,
    searchKeyword: '',
    activeFilter: 'all',
    sortType: 'time',
    showFilterDropdown: false,
    showSortDropdown: false,
    showActionMenu: false,
    statusBarHeight: 20,
    headerHeight: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.hideTabBar();
    this.getStatusBarHeight();
    this.loadUserData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    wx.hideTabBar();
  },

  /**
   * 切换标签页
   */
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    
    // 根据点击的标签进行页面跳转
    switch (tab) {
      case 'dashboard':
        wx.redirectTo({
          url: '/pages/admin/dashboard/dashboard',
        });
        break;
      case 'products':
        wx.redirectTo({
          url: '/pages/admin/products/products',
        });
        break;
      case 'categories':
        wx.redirectTo({
          url: '/pages/admin/categories/categories',
        });
        break;
      case 'orders':
        wx.redirectTo({
          url: '/pages/admin/orders/orders',
        });
        break;
      case 'users':
        // 已经在用户页面，不做跳转
        break;
    }
  },

  /**
   * 获取状态栏高度
   */
  getStatusBarHeight: function() {
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      headerHeight: systemInfo.statusBarHeight + 44
    })
  },

  // 加载用户数据
  loadUserData: function() {
    console.log('开始加载用户数据');
    // 先重置状态
    this.setData({
      isLoading: false,
      showEmpty: false,
      page: 1,
      hasMore: true,
      userList: [],
      // 重置搜索状态，让用户在切换页面后不受之前搜索的干扰
      searchKeyword: '',
      activeFilter: 'all',
      sortType: 'time'
    }, () => {
      console.log('状态重置完成，开始加载用户列表');
      this.loadUserList(true);
      this.getUserCounts();
    });
  },

  // 获取各类型用户数量
  getUserCounts: async function() {
    console.log('开始获取用户数量');
    try {
      const res = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'getUserCounts'
        }
      });
      console.log('获取用户数量结果：', res);

      if (res.result && res.result.success) {
        const updatedTabs = this.data.tabs.map((tab, index) => ({
          ...tab,
          count: res.result.data[index] || 0
        }));

        this.setData({ tabs: updatedTabs });
        console.log('用户数量更新完成：', updatedTabs);
      } else {
        throw new Error(res.result?.message || '获取用户数量失败');
      }
    } catch (error) {
      console.error('获取用户数量失败：', error);
      wx.showToast({
        title: '获取用户数量失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 加载用户列表
   */
  loadUserList: function(refresh = false) {
    // 如果已经在加载，则返回
    if (this.data.isLoading) {
      return;
    }
    
    // 如果没有更多数据，则返回
    if (!refresh && !this.data.hasMore) {
      return;
    }
    
    this.setData({
      isLoading: true,
      loading: true
    });
    
    const { page, pageSize, sortType, activeFilter, searchKeyword } = this.data;
    
    console.log('发送搜索请求，关键词:', searchKeyword);
    
    wx.cloud.callFunction({
      name: 'userManager',
      data: {
        action: 'getUsers',
        page,
        limit: pageSize,
        sort: sortType === 'time' ? 'registerTime' : 'totalSpent',
        order: 'desc',
        filter: activeFilter,
        keyword: searchKeyword
      }
    }).then(res => {
      console.log('搜索结果返回:', res);
      if (res.result && res.result.success) {
        const newUsers = (res.result.data || []).map(user => ({
          ...user,
          registerTime: this.formatDate(user.registerTime)
        }));
        
        console.log('处理后的用户数据:', newUsers);
        let userList = refresh ? newUsers : [...this.data.userList, ...newUsers];
        
        this.setData({
          userList,
          total: res.result.total || 0,
          hasMore: newUsers.length >= pageSize,
          page: page + 1,
          loading: false,
          isLoading: false,
          showEmpty: userList.length === 0
        });
        
        console.log('更新后的用户列表:', userList);
      } else {
        throw new Error(res.result?.message || '获取用户列表失败');
      }
    }).catch(error => {
      console.error('获取用户列表失败:', error);
      wx.showToast({
        title: '获取用户列表失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({
        loading: false,
        isLoading: false
      });
    });
  },

  /**
   * 查看用户详情
   */
  viewUserDetail: function (e) {
    const userId = e.currentTarget.dataset.id
    const user = this.data.userList.find(item => item._id === userId)
    
    if (user) {
      this.setData({
        currentUser: user,
        showUserDetail: true
      })
    }
  },

  /**
   * 关闭用户详情弹窗
   */
  closeUserDetail: function () {
    this.setData({
      showUserDetail: false,
      currentUser: null
    })
  },

  // 切换用户状态
  toggleUserStatus: async function(e) {
    // 如果是从操作菜单中点击，直接使用actionUser
    const userId = e.currentTarget.dataset.id || (this.data.actionUser ? this.data.actionUser._id : null);
    if (!userId) return;
    
    const userIndex = this.data.userList.findIndex(item => item._id === userId);
    
    if (userIndex !== -1) {
      const newStatus = this.data.userList[userIndex].status === 'active' ? 'inactive' : 'active';
      
      try {
        // 如果是从操作菜单中点击，先保存actionUser的状态，然后隐藏菜单
        if (!e.currentTarget.dataset.id && this.data.actionUser) {
          // 先隐藏菜单
          this.hideActionMenu();
        }
        
        const res = await wx.cloud.callFunction({
          name: 'userManager',
          data: {
            action: 'updateUserStatus',
            data: {
              userId,
              status: newStatus
            }
          }
        });

        if (res.result && res.result.success) {
          // 更新本地状态
          const userList = this.data.userList;
          userList[userIndex].status = newStatus;
          
          this.setData({ userList });
          
          wx.showToast({
            title: newStatus === 'active' ? '已启用该用户' : '已禁用该用户',
            icon: 'success'
          });
          
          // 更新用户数量统计
          this.getUserCounts();
        } else {
          throw new Error(res.result?.message || '更新用户状态失败');
        }
      } catch (error) {
        console.error('更新用户状态失败：', error);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    }
  },

  // 升级用户会员等级
  upgradeUser: async function(e) {
    const userId = e.currentTarget.dataset.id;
    const userIndex = this.data.userList.findIndex(item => item._id === userId);
    
    if (userIndex !== -1 && this.data.userList[userIndex].level === 'normal') {
      try {
        const res = await wx.cloud.callFunction({
          name: 'userManager',
          data: {
            action: 'upgradeUserLevel',
            data: {
              userId
            }
          }
        });

        if (res.result.success) {
          // 更新本地状态
          const userList = this.data.userList;
          userList[userIndex].level = 'premium';
          
          this.setData({ userList });
          
          wx.showToast({
            title: '已升级为高级会员',
            icon: 'success'
          });

          // 更新用户数量统计
          this.getUserCounts();
          
          // 如果是在弹窗中修改，同时更新currentUser
          if (this.data.currentUser && this.data.currentUser._id === userId) {
            const currentUser = {...this.data.currentUser, level: 'premium'};
            this.setData({ currentUser });
          }
        } else {
          throw new Error(res.result.message);
        }
      } catch (error) {
        console.error('升级用户等级失败：', error);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 重置用户密码
   */
  resetPassword: function (e) {
    const userId = e.currentTarget.dataset.id || (this.data.currentUser ? this.data.currentUser._id : null)
    
    if (userId) {
      // 实际项目中应调用API重置密码
      wx.showModal({
        title: '密码重置确认',
        content: '确定要重置该用户的密码吗？',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '密码重置成功',
              icon: 'success'
            })
          }
        }
      })
    }
  },

  /**
   * 导出用户数据
   */
  exportUserData: function () {
    wx.showToast({
      title: '数据导出中...',
      icon: 'loading',
      duration: 2000
    })
    
    // 实际项目中应调用API导出数据
    setTimeout(() => {
      wx.showToast({
        title: '导出成功',
        icon: 'success'
      })
    }, 2000)
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      }, () => {
        this.loadUserList();
      });
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    this.setData({
      page: 1,
      hasMore: true
    }, () => {
      this.loadUserData();
      wx.stopPullDownRefresh();
    });
  },

  // 格式化日期
  formatDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /**
   * 搜索输入事件处理
   */
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 清除搜索内容
   */
  clearSearch: function() {
    this.setData({
      searchKeyword: ''
    });
    // 重置搜索结果
    this.loadUserList(true);
  },

  /**
   * 执行搜索
   */
  searchUsers: function() {
    // 清除之前的定时器，避免重复搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    const keyword = this.data.searchKeyword || '';
    console.log('回车搜索触发，关键词:', keyword);
    
    this.setData({
      page: 1,
      hasMore: true
    }, () => {
      this.loadUserList(true);
    });
  },

  /**
   * 切换筛选下拉菜单
   */
  toggleFilterDropdown: function() {
    this.setData({
      showFilterDropdown: !this.data.showFilterDropdown,
      showSortDropdown: false
    });
  },

  /**
   * 选择筛选选项
   */
  selectFilter: function(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      activeFilter: filter,
      page: 1,
      hasMore: true,
      showFilterDropdown: false
    }, () => {
      this.loadUserList(true);
    });
  },

  /**
   * 切换排序下拉菜单
   */
  toggleSortDropdown: function() {
    this.setData({
      showSortDropdown: !this.data.showSortDropdown,
      showFilterDropdown: false
    });
  },

  /**
   * 选择排序选项
   */
  selectSort: function(e) {
    const sort = e.currentTarget.dataset.sort;
    this.setData({
      sortType: sort,
      page: 1,
      hasMore: true,
      showSortDropdown: false
    }, () => {
      this.loadUserList(true);
    });
  },

  /**
   * 显示操作菜单
   */
  showActionMenu: function(e) {
    // 阻止冒泡，避免触发用户详情
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    const userId = e.currentTarget.dataset.id;
    const user = this.data.userList.find(item => item._id === userId);
    
    if (user) {
      this.setData({
        actionUser: user,
        showActionMenu: true
      });
    }
  },

  /**
   * 隐藏操作菜单
   */
  hideActionMenu: function() {
    this.setData({
      showActionMenu: false,
      actionUser: null
    });
  },

  /**
   * 添加用户
   */
  addUser: function() {
    wx.showToast({
      title: '添加用户功能开发中',
      icon: 'none'
    });
  },

  /**
   * 编辑用户
   */
  editUser: function() {
    if (!this.data.actionUser) return;
    
    // 保存用户信息副本
    const nickname = this.data.actionUser.nickname;
    const userId = this.data.actionUser._id;
    
    // 先隐藏菜单
    this.hideActionMenu();
    
    console.log('编辑用户ID:', userId, '名称:', nickname);
    
    // 跳转到编辑页面
    wx.navigateTo({
      url: '/pages/admin/editUser/editUser?id=' + userId,
      fail: function(err) {
        console.error('页面跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 删除用户
   */
  deleteUser: function() {
    if (!this.data.actionUser) return;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除用户 ' + this.data.actionUser.nickname + ' 吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          // 保存本地副本，防止hideActionMenu清除actionUser
          const userId = this.data.actionUser._id;
          
          // 先隐藏菜单
          this.hideActionMenu();
          
          // 调用云函数删除用户
          wx.showLoading({
            title: '删除中...',
            mask: true
          });
          
          wx.cloud.callFunction({
            name: 'userManager',
            data: {
              action: 'deleteUser',
              data: {
                userId: userId
              }
            }
          }).then(res => {
            wx.hideLoading();
            
            if (res.result && res.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 更新本地数据
              const userList = this.data.userList.filter(user => user._id !== userId);
              this.setData({ userList });
              
              // 更新用户数量统计
              this.getUserCounts();
            } else {
              throw new Error(res.result?.message || '删除用户失败');
            }
          }).catch(error => {
            wx.hideLoading();
            console.error('删除用户失败：', error);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  /**
   * 登出操作
   */
  logout: function() {
    wx.showModal({
      title: '确认登出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 实际项目中应调用登出API
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            success: () => {
              // 跳转到登录页
              // wx.redirectTo({
              //   url: '/pages/login/login'
              // });
            }
          });
        }
      }
    });
  },

  /**
   * 底部导航栏页面跳转
   */
  navigateTo: function(e) {
    const url = e.currentTarget.dataset.url;
    
    // 判断是否为当前页面
    if (url === '/pages/admin/users/users') {
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

  // 切换排序方式
  changeSort: function(e) {
    const sortType = e.currentTarget.dataset.type;
    this.setData({
      sortType,
      page: 1,
      hasMore: true,
      showSortDropdown: false
    }, () => {
      this.loadUserList(true);
    });
  },

  // 切换筛选方式
  changeFilter: function(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      activeFilter: filter,
      page: 1,
      hasMore: true,
      showFilterDropdown: false
    }, () => {
      this.loadUserList(true);
    });
  },
}) 