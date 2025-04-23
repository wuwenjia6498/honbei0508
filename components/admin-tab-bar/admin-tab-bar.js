Component({
  /**
   * 组件的属性列表
   */
  properties: {
    activeTab: {
      type: String,
      value: 'dashboard' // 默认激活的标签页
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 标签项配置
    tabs: [
      {
        id: 'dashboard',
        text: '统计',
        iconPath: '/assets/images/icons/home.png',
        selectedIconPath: '/assets/images/icons/home-active.png',
        url: '/pages/admin/dashboard/dashboard'
      },
      {
        id: 'products',
        text: '商品',
        iconPath: '/assets/images/icons/category.png',
        selectedIconPath: '/assets/images/icons/category-active.png',
        url: '/pages/admin/products/products'
      },
      {
        id: 'categories',
        text: '分类',
        iconPath: '/assets/images/icons/category.png',
        selectedIconPath: '/assets/images/icons/category-active.png',
        url: '/pages/admin/categories/categories'
      },
      {
        id: 'orders',
        text: '订单',
        iconPath: '/assets/images/icons/cart.png',
        selectedIconPath: '/assets/images/icons/cart-active.png',
        url: '/pages/admin/orders/orders'
      },
      {
        id: 'users',
        text: '用户',
        iconPath: '/assets/images/icons/user.png',
        selectedIconPath: '/assets/images/icons/user-active.png',
        url: '/pages/admin/users/users'
      }
    ]
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 切换标签页
     */
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      const url = e.currentTarget.dataset.url;
      
      // 如果点击的不是当前标签页，则进行页面跳转
      if (tab !== this.properties.activeTab) {
        wx.redirectTo({
          url: url
        });
      }
    }
  }
}) 