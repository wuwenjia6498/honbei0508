Page({
  /**
   * 页面的初始数据
   */
  data: {
    categories: [
      {
        id: 1,
        name: '面包类',
        image: '/assets/images/products/product-croissant.jpg',
        productCount: 12,
        order: 1,
        isActive: true
      },
      {
        id: 2,
        name: '蛋糕类',
        image: '/assets/images/products/product-tiramisu.jpg',
        productCount: 8,
        order: 2,
        isActive: true
      },
      {
        id: 3,
        name: '饼干类',
        image: '/assets/images/products/product-brownie.jpg',
        productCount: 6,
        order: 3,
        isActive: true
      },
      {
        id: 4,
        name: '甜点类',
        image: '/assets/images/products/product-matcha-cake.jpg',
        productCount: 5,
        order: 4,
        isActive: true
      },
      {
        id: 5,
        name: '饮品类',
        image: '/assets/images/products/photo-1499636136210-6f4ee915583e.jpeg',
        productCount: 3,
        order: 5,
        isActive: true
      },
      {
        id: 6,
        name: '手工派类',
        image: '/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg',
        productCount: 4,
        order: 6,
        isActive: true
      }
    ],
    showAddForm: false,
    showEditForm: false,
    currentCategory: null,
    newCategory: {
      name: '',
      order: '',
      isActive: true
    },
    dragging: false,
    startY: 0,
    currentIndex: -1,
    categoryColors: {
      '面包类': '#FFF3E0',
      '蛋糕类': '#E1F5FE',
      '饼干类': '#F9FBE7',
      '甜点类': '#E8F5E9',
      '饮品类': '#E0F7FA',
      '手工派类': '#FFF9C4',
      '默认': '#F5F5F5'
    },
    categoryIcons: {
      '面包类': '/assets/images/icons/category.png',
      '蛋糕类': '/assets/images/icons/category.png',
      '饼干类': '/assets/images/icons/category.png',
      '甜点类': '/assets/images/icons/category.png',
      '饮品类': '/assets/images/icons/category.png',
      '手工派类': '/assets/images/icons/category.png',
      '默认': '/assets/images/icons/category.png'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查管理员登录状态
    this.checkAdminAuth();
    
    // 获取分类数据
    this.getCategoriesData();
    
    // 占位函数，后续开发时会完善
    wx.hideTabBar();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 占位函数，后续开发时会完善
    wx.hideTabBar();
  },

  /**
   * 检查管理员登录状态
   */
  checkAdminAuth: function() {
    const isAdminLoggedIn = wx.getStorageSync('adminLoggedIn');
    // 临时注释调跳转，方便开发
    // if (!isAdminLoggedIn) {
    //   wx.redirectTo({
    //     url: '/pages/admin/login/login'
    //   });
    // }
    
    // 为了测试，临时设置管理员登录状态
    wx.setStorageSync('adminLoggedIn', true);
  },

  /**
   * 获取分类数据
   */
  getCategoriesData: function() {
    // 模拟从服务器获取数据的过程
    wx.showLoading({
      title: '加载中',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      // 实际应用中，这里应该调用API获取分类数据
    }, 500);
  },

  /**
   * 获取分类图标
   */
  getCategoryIcon: function(categoryName) {
    const { categoryIcons } = this.data;
    return categoryIcons[categoryName] || categoryIcons['默认'];
  },

  /**
   * 获取分类背景色
   */
  getCategoryColor: function(categoryName) {
    const { categoryColors } = this.data;
    return categoryColors[categoryName] || categoryColors['默认'];
  },

  /**
   * 打开添加分类表单
   */
  showAddCategoryForm: function() {
    // 设置新分类的默认排序值为当前分类数量+1
    const defaultOrder = this.data.categories.length + 1;
    
    this.setData({
      showAddForm: true,
      newCategory: {
        name: '',
        order: defaultOrder,
        isActive: true
      }
    });
  },

  /**
   * 关闭添加分类表单
   */
  closeAddCategoryForm: function() {
    this.setData({
      showAddForm: false
    });
  },

  /**
   * 提交添加分类表单
   */
  submitAddCategory: function() {
    const { newCategory } = this.data;
    
    // 简单的表单验证
    if (!newCategory.name) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }
    
    // 模拟添加分类到服务器
    wx.showLoading({
      title: '添加中',
    });
    
    setTimeout(() => {
      // 模拟添加成功
      const categories = this.data.categories;
      // 生成一个新的ID（真实环境中应由服务器生成）
      const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
      
      // 创建新分类对象
      const categoryToAdd = {
        ...newCategory,
        id: newId,
        order: parseInt(newCategory.order) || categories.length + 1,
        image: '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg', // 默认图片
        productCount: 0
      };
      
      // 添加到数组
      categories.push(categoryToAdd);
      
      // 按照order排序
      categories.sort((a, b) => a.order - b.order);
      
      this.setData({
        categories,
        showAddForm: false
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    }, 1000);
  },

  /**
   * 打开编辑分类表单
   */
  showEditCategoryForm: function(e) {
    const id = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === id);
    
    if (category) {
      this.setData({
        currentCategory: { ...category },
        showEditForm: true
      });
    }
  },

  /**
   * 关闭编辑分类表单
   */
  closeEditCategoryForm: function() {
    this.setData({
      showEditForm: false,
      currentCategory: null
    });
  },

  /**
   * 提交编辑分类表单
   */
  submitEditCategory: function() {
    const { currentCategory, categories } = this.data;
    
    // 简单的表单验证
    if (!currentCategory.name) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }
    
    // 模拟更新分类到服务器
    wx.showLoading({
      title: '更新中',
    });
    
    setTimeout(() => {
      // 更新分类列表
      const updatedCategories = categories.map(c => {
        if (c.id === currentCategory.id) {
          return {
            ...currentCategory,
            order: parseInt(currentCategory.order) || c.order
          };
        }
        return c;
      });
      
      // 按照order排序
      updatedCategories.sort((a, b) => a.order - b.order);
      
      this.setData({
        categories: updatedCategories,
        showEditForm: false,
        currentCategory: null
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
    }, 1000);
  },

  /**
   * 删除分类
   */
  deleteCategory: function(e) {
    const id = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === id);
    
    // 判断分类下是否有商品
    if (category && category.productCount > 0) {
      wx.showModal({
        title: '无法删除',
        content: `该分类下还有${category.productCount}个商品，请先移除或重新分类这些商品。`,
        showCancel: false
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该分类吗？此操作不可恢复。',
      success: res => {
        if (res.confirm) {
          // 模拟从服务器删除分类
          wx.showLoading({
            title: '删除中',
          });
          
          setTimeout(() => {
            // 从列表中移除
            const updatedCategories = this.data.categories.filter(c => c.id !== id);
            
            this.setData({
              categories: updatedCategories
            });
            
            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          }, 1000);
        }
      }
    });
  },

  /**
   * 切换分类状态（启用/禁用）
   */
  toggleCategoryStatus: function(e) {
    const id = e.currentTarget.dataset.id;
    const categories = this.data.categories;
    const category = categories.find(c => c.id === id);
    
    if (category) {
      // 模拟向服务器更新状态
      wx.showLoading({
        title: '更新中',
      });
      
      setTimeout(() => {
        // 更新分类列表
        const updatedCategories = categories.map(c => {
          if (c.id === id) {
            return { ...c, isActive: !c.isActive };
          }
          return c;
        });
        
        this.setData({
          categories: updatedCategories
        });
        
        wx.hideLoading();
        wx.showToast({
          title: category.isActive ? '已禁用' : '已启用',
          icon: 'success'
        });
      }, 500);
    }
  },

  /**
   * 输入框变更处理（新增分类）
   */
  onNewCategoryInput: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`newCategory.${field}`]: value
    });
  },

  /**
   * 输入框变更处理（编辑分类）
   */
  onEditCategoryInput: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`currentCategory.${field}`]: value
    });
  },

  /**
   * 切换开关变更处理（新增分类）
   */
  onNewCategorySwitchChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'newCategory.isActive': value
    });
  },

  /**
   * 切换开关变更处理（编辑分类）
   */
  onEditCategorySwitchChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'currentCategory.isActive': value
    });
  },

  /**
   * 开始拖动排序
   */
  dragStart: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      dragging: true,
      startY: e.touches[0].clientY,
      currentIndex: index
    });
  },

  /**
   * 拖动中
   */
  dragging: function(e) {
    if (!this.data.dragging) return;
    
    const moveY = e.touches[0].clientY;
    const diffY = moveY - this.data.startY;
    
    if (Math.abs(diffY) > 30) { // 拖动距离超过30px才触发排序
      const { currentIndex, categories } = this.data;
      let targetIndex = -1;
      
      if (diffY < 0 && currentIndex > 0) {
        // 向上拖动
        targetIndex = currentIndex - 1;
      } else if (diffY > 0 && currentIndex < categories.length - 1) {
        // 向下拖动
        targetIndex = currentIndex + 1;
      }
      
      if (targetIndex !== -1) {
        // 交换位置
        const newCategories = [...categories];
        const temp = newCategories[currentIndex];
        newCategories[currentIndex] = newCategories[targetIndex];
        newCategories[targetIndex] = temp;
        
        // 更新order值
        newCategories[currentIndex].order = currentIndex + 1;
        newCategories[targetIndex].order = targetIndex + 1;
        
        this.setData({
          categories: newCategories,
          startY: moveY,
          currentIndex: targetIndex
        });
      }
    }
  },

  /**
   * 拖动结束
   */
  dragEnd: function() {
    if (this.data.dragging) {
      // 模拟向服务器更新排序
      wx.showToast({
        title: '排序已更新',
        icon: 'success'
      });
      
      this.setData({
        dragging: false,
        startY: 0,
        currentIndex: -1
      });
    }
  },

  /**
   * 切换底部标签页
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
        // 已经在分类页面，不做跳转
        break;
      case 'orders':
        wx.redirectTo({
          url: '/pages/admin/orders/orders',
        });
        break;
      case 'users':
        wx.redirectTo({
          url: '/pages/admin/users/users',
        });
        break;
    }
  }
}) 