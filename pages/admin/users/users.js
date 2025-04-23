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
   * 加载用户列表
   */
  loadUserList: function (showLoading = false) {
    if (this.data.loading || (!showLoading && !this.data.hasMore)) return

    this.setData({ loading: true })

    if (showLoading) {
      this.setData({ loading: true })
      wx.showLoading({ title: '加载中' })
    }

    // 根据当前标签页筛选用户类型
    const userType = this.data.activeTab === 0 ? '' : 
                    this.data.activeTab === 1 ? 'normal' :
                    this.data.activeTab === 2 ? 'premium' : 'disabled'

    // 模拟API请求获取用户列表
    // 实际项目中应替换为真实的API调用
    setTimeout(() => {
      // 模拟数据
      const mockUsers = this.getMockUsers(this.data.page, this.data.pageSize, userType)
      
      const tabCounts = this.getTabCounts()
      
      // 更新Tab计数
      const updatedTabs = this.data.tabs.map((tab, index) => {
        return {
          ...tab,
          count: tabCounts[index]
        }
      })
      
      this.setData({
        userList: this.data.page === 1 ? mockUsers : [...this.data.userList, ...mockUsers],
        hasMore: mockUsers.length === this.data.pageSize,
        loading: false,
        showEmpty: this.data.page === 1 && mockUsers.length === 0,
        isLoading: false,
        tabs: updatedTabs
      })
      
      if (showLoading) {
        wx.hideLoading()
      }
    }, 800)
  },

  /**
   * 模拟获取用户数据
   * 实际项目中应删除此方法，使用真实API
   */
  getMockUsers: function(page, pageSize, userType) {
    // 模拟用户数据生成
    const total = 35 // 总用户数
    const startIndex = (page - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, total)
    const hasMore = endIndex < total
    
    const userTypes = ['normal', 'premium']
    const statusTypes = ['active', 'inactive']
    
    let list = []
    
    for (let i = startIndex; i < endIndex; i++) {
      const type = userTypes[Math.floor(Math.random() * userTypes.length)]
      const status = i % 7 === 0 ? 'inactive' : 'active'
      
      // 如果指定了用户类型，且不匹配则跳过
      if (userType === 'disabled' && status !== 'inactive') continue
      if (userType && userType !== 'disabled' && userType !== type) continue
      
      list.push({
        id: `user_${i + 1}`,
        avatar: '/images/default-avatar.png', // 默认头像，实际项目中应替换
        nickname: `用户${i + 1}`,
        phone: `1381234${(1000 + i).toString().substring(1)}`,
        level: type,
        status: status,
        registerTime: `2023-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
        orderCount: Math.floor(Math.random() * 20),
        totalSpent: Math.floor(Math.random() * 10000) / 100
      })
    }
    
    return list
  },

  /**
   * 查看用户详情
   */
  viewUserDetail: function (e) {
    const userId = e.currentTarget.dataset.id
    const user = this.data.userList.find(item => item.id === userId)
    
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

  /**
   * 切换用户状态（启用/禁用）
   */
  toggleUserStatus: function (e) {
    const userId = e.currentTarget.dataset.id
    const userIndex = this.data.userList.findIndex(item => item.id === userId)
    
    if (userIndex !== -1) {
      const newStatus = this.data.userList[userIndex].status === 'active' ? 'inactive' : 'active'
      
      // 更新本地状态
      const userList = this.data.userList
      userList[userIndex].status = newStatus
      
      this.setData({ userList })
      
      // 实际项目中应调用API更新用户状态
      wx.showToast({
        title: newStatus === 'active' ? '已启用该用户' : '已禁用该用户',
        icon: 'success'
      })
      
      // 如果是在弹窗中修改，同时更新currentUser
      if (this.data.currentUser && this.data.currentUser.id === userId) {
        const currentUser = {...this.data.currentUser, status: newStatus}
        this.setData({ currentUser })
      }
    }
  },

  /**
   * 升级用户会员等级
   */
  upgradeUser: function (e) {
    const userId = e.currentTarget.dataset.id
    const userIndex = this.data.userList.findIndex(item => item.id === userId)
    
    if (userIndex !== -1 && this.data.userList[userIndex].level === 'normal') {
      // 更新本地状态
      const userList = this.data.userList
      userList[userIndex].level = 'premium'
      
      this.setData({ userList })
      
      // 实际项目中应调用API更新用户等级
      wx.showToast({
        title: '已升级为高级会员',
        icon: 'success'
      })
      
      // 如果是在弹窗中修改，同时更新currentUser
      if (this.data.currentUser && this.data.currentUser.id === userId) {
        const currentUser = {...this.data.currentUser, level: 'premium'}
        this.setData({ currentUser })
      }
    }
  },

  /**
   * 重置用户密码
   */
  resetPassword: function (e) {
    const userId = e.currentTarget.dataset.id || (this.data.currentUser ? this.data.currentUser.id : null)
    
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
  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadUserList(false)
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.setData({
      userList: [],
      page: 1,
      hasMore: true
    })
    this.loadUserList(true)
    wx.stopPullDownRefresh()
  },

  getTabCounts: function() {
    const mockUsers = this.getMockUsers(1, this.data.pageSize, '')
    
    const totalCount = mockUsers.length
    const normalCount = mockUsers.filter(user => user.level === 'normal').length
    const premiumCount = mockUsers.filter(user => user.level === 'premium').length
    const inactiveCount = mockUsers.filter(user => user.status === 'inactive').length
    
    return [totalCount, normalCount, premiumCount, inactiveCount]
  },

  /**
   * 加载用户数据
   */
  loadUserData: function() {
    this.setData({ loading: true });
    
    // 模拟加载数据，实际项目中应该从服务器获取
    setTimeout(() => {
      // 模拟数据
      const mockUsers = [
        {
          id: '001',
          nickname: '李小姐',
          phone: '13812345678',
          level: 'premium',
          status: 'active',
          registerTime: '2023-01-15',
          totalSpent: '1,258',
          avatar: '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg'
        },
        {
          id: '002',
          nickname: '王先生',
          phone: '13987654321',
          level: 'normal',
          status: 'active',
          registerTime: '2023-02-22',
          totalSpent: '786',
          avatar: '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg'
        },
        {
          id: '003',
          nickname: '张小姐',
          phone: '13600123456',
          level: 'premium',
          status: 'active',
          registerTime: '2022-11-05',
          totalSpent: '2,143',
          avatar: '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg'
        },
        {
          id: '004',
          nickname: '赵先生',
          phone: '13911233444',
          level: 'normal',
          status: 'active',
          registerTime: '2023-03-17',
          totalSpent: '452',
          avatar: '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg'
        },
        {
          id: '005',
          nickname: '陈小姐',
          phone: '13855667788',
          level: 'normal',
          status: 'active',
          registerTime: '2023-05-02',
          totalSpent: '86',
          avatar: '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg'
        },
        {
          id: '006',
          nickname: '刘先生',
          phone: '13712345678',
          level: 'normal',
          status: 'inactive',
          registerTime: '2023-05-08',
          totalSpent: '0',
          avatar: '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg'
        }
      ];
      
      this.setData({
        userList: mockUsers,
        loading: false
      });
    }, 1000);
  },

  /**
   * 搜索输入事件处理
   */
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
    
    // 实际项目中可根据关键词筛选用户
    // this.filterUsers();
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
      showFilterDropdown: false
    });
    
    // 实际项目中可根据筛选条件过滤用户
    // this.filterUsers();
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
      showSortDropdown: false
    });
    
    // 实际项目中可根据排序条件排序用户
    // this.sortUsers();
  },

  /**
   * 显示操作菜单
   */
  showActionMenu: function(e) {
    // 阻止冒泡，避免触发用户详情
    e.stopPropagation();
    
    const userId = e.currentTarget.dataset.id;
    const user = this.data.userList.find(item => item.id === userId);
    
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
    
    wx.showToast({
      title: '编辑用户: ' + this.data.actionUser.nickname,
      icon: 'none'
    });
    
    this.hideActionMenu();
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
          // 实际项目中应调用API删除用户
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          // 更新本地数据
          const userList = this.data.userList.filter(user => user.id !== this.data.actionUser.id);
          this.setData({ userList });
        }
      }
    });
    
    this.hideActionMenu();
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

  /**
   * 获取状态栏高度
   */
  getStatusBarHeight: function() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const headerHeight = statusBarHeight + 44;
    
    this.setData({
      statusBarHeight: statusBarHeight,
      headerHeight: headerHeight
    });
  },
}) 