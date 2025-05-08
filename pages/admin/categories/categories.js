Page({
  /**
   * 页面的初始数据
   */
  data: {
    categories: [],
    showAddForm: false,
    showEditForm: false,
    currentCategory: null,
    newCategory: {
      name: '',
      order: '',
      isActive: true,
      tempImage: ''
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
      '面包类': '/assets/images/icons/category-active.png',
      '蛋糕类': '/assets/images/icons/star.svg',
      '饼干类': '/assets/images/icons/heart.svg',
      '甜点类': '/assets/images/icons/heart-filled.svg',
      '饮品类': '/assets/images/icons/notification.svg',
      '手工派类': '/assets/images/icons/share.svg',
      '默认': '/assets/images/icons/category.png'
    },
    loading: false,
    errorMessage: '',
    isCategoriesLoaded: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查管理员登录状态
    this.checkAdminAuth();
    
    // 获取分类数据
    this.getCategoriesData();
    
    // 隐藏底部导航栏
    wx.hideTabBar();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 隐藏底部导航栏
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
    wx.showLoading({
      title: '加载中',
    });
    
    // 调用云函数获取分类数据
    wx.cloud.callFunction({
      name: 'getCategories',
      data: {}
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.data) {
        // 处理分类数据，添加id字段以兼容旧代码
        let categories = res.result.data.map(item => ({
          ...item,
          id: item._id, // 为了兼容现有代码，将_id也复制到id字段
          productCount: item.productCount || 0 // 确保使用服务器返回的商品数量
        }));
        
        // 去重处理：通过分类名称去重
        const uniqueCategories = [];
        const categoryNamesSet = new Set();
        
        categories.forEach(category => {
          if (!categoryNamesSet.has(category.name)) {
            categoryNamesSet.add(category.name);
            uniqueCategories.push(category);
          } else {
            console.log(`发现重复分类: ${category.name}，已跳过`);
          }
        });
        
        this.setData({
          categories: uniqueCategories,
          isCategoriesLoaded: true
        });
        
        console.log('分类数据加载成功，包含商品数量:', uniqueCategories);
        
        // 调试信息：记录每个分类的商品数量
        uniqueCategories.forEach(category => {
          console.log(`分类 "${category.name}" 的商品数量: ${category.productCount || 0}`);
        });
      } else {
        console.error('获取分类数据失败:', res);
        wx.showToast({
          title: '获取分类失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('获取分类数据失败:', err);
      wx.showToast({
        title: '获取分类失败',
        icon: 'none'
      });
    });
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
   * 上传分类图片到云存储
   */
  uploadCategoryImageToCloud: function(tempFilePath) {
    return new Promise((resolve, reject) => {
      // 生成随机文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const cloudPath = `categories/${timestamp}_${randomStr}.jpg`;
      
      // 上传到云存储
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath,
        success: res => {
          console.log('分类图片上传成功:', res);
          const fileID = res.fileID;
          
          // 获取临时访问链接
          wx.cloud.getTempFileURL({
            fileList: [fileID],
            success: result => {
              console.log('获取临时文件链接成功', result);
              if (result.fileList && result.fileList.length > 0) {
                const tempFileURL = result.fileList[0].tempFileURL;
                
                // 将临时URL存入缓存
                const cacheKey = `category_image_${timestamp}_${randomStr}`;
                wx.setStorageSync(cacheKey, tempFileURL);
                
                // 返回fileID，而不是临时URL
                resolve(fileID);
              } else {
                resolve(fileID);
              }
            },
            fail: err => {
              console.error('获取临时文件链接失败', err);
              // 即使获取临时链接失败，仍返回fileID
              resolve(fileID);
            }
          });
        },
        fail: err => {
          console.error('分类图片上传失败:', err);
          reject(err);
        }
      });
    });
  },

  /**
   * 为新分类选择图片
   */
  chooseNewCategoryImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 获取选中图片的临时路径
        const tempFilePath = res.tempFilePaths[0];
        
        // 更新数据，显示预览图
        this.setData({
          'newCategory.tempImage': tempFilePath
        });
        
        wx.showToast({
          title: '图片选择成功',
          icon: 'success'
        });
      }
    });
  },
  
  /**
   * 为当前编辑分类选择图片
   */
  chooseCurrentCategoryImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 获取选中图片的临时路径
        const tempFilePath = res.tempFilePaths[0];
        
        // 更新数据，显示预览图
        this.setData({
          'currentCategory.tempImage': tempFilePath
        });
        
        wx.showToast({
          title: '图片选择成功',
          icon: 'success'
        });
      }
    });
  },
  
  /**
   * 移除新分类图片
   */
  removeNewCategoryImage: function() {
    this.setData({
      'newCategory.tempImage': ''
    });
  },
  
  /**
   * 移除当前编辑分类图片
   */
  removeCurrentCategoryImage: function() {
    this.setData({
      'currentCategory.tempImage': '',
      'currentCategory.image': '' // 同时清除原有图片路径
    });
  },

  /**
   * 清理缓存文件
   */
  removeTempFile: function(filePath) {
    if (filePath && filePath.startsWith('wxfile://')) {
      wx.removeSavedFile({
        filePath: filePath,
        fail: function() {
          console.log('删除临时文件失败', filePath);
        }
      });
    }
  },

  /**
   * 提交添加分类
   */
  submitAddCategory: function() {
    const newCategory = this.data.newCategory;
    
    // 表单验证
    if (!newCategory.name) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '保存中',
    });
    
    // 准备提交的分类数据
    const categoryData = {
      name: newCategory.name,
      isActive: true,
      order: newCategory.order || this.data.categories.length + 1
    };
    
    console.log('准备添加分类:', categoryData);
    console.log('是否有图片:', !!newCategory.tempImage);
    
    // 处理图片上传
    let uploadTask;
    if (newCategory.tempImage) {
      uploadTask = this.uploadCategoryImageToCloud(newCategory.tempImage);
    } else {
      // 如果没有选择图片，就使用空字符串
      uploadTask = Promise.resolve('');
    }
    
    uploadTask.then(imageUrl => {
      // 如果上传了图片，将图片URL添加到分类数据中
      if (imageUrl) {
        categoryData.image = imageUrl;
        console.log('图片上传成功:', imageUrl);
      }
      
      console.log('最终添加的分类数据:', categoryData);
      
      // 调用云函数添加分类
      return wx.cloud.callFunction({
        name: 'getCategories',
        data: {
          action: 'add',
          category: categoryData
        }
      });
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        // 关闭添加表单并刷新分类列表
        this.closeAddCategoryForm();
        this.getCategoriesData();
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result?.message || '添加失败',
          icon: 'none'
        });
        console.error('添加分类失败:', res);
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      });
      console.error('添加分类失败:', err);
    });
  },

  /**
   * 打开编辑分类表单
   */
  showEditCategoryForm: function(e) {
    const id = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === id);
    
    if (category) {
      console.log('打开编辑分类表单:', category);
      
      // 确保分类数据包含ID字段
      const categoryWithId = { 
        ...category,
        _id: category._id || category.id // 确保有_id字段
      };
      
      this.setData({
        currentCategory: categoryWithId,
        showEditForm: true
      });
    } else {
      console.error('找不到对应的分类:', id);
      wx.showToast({
        title: '找不到分类',
        icon: 'none'
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
   * 提交编辑分类
   */
  submitEditCategory: function() {
    const editCategory = this.data.currentCategory;
    
    // 表单验证
    if (!editCategory.name) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '保存中',
    });
    
    // 获取分类ID
    const categoryId = editCategory._id || editCategory.id;
    
    // 确保分类ID存在
    if (!categoryId) {
      wx.hideLoading();
      wx.showToast({
        title: '缺少分类ID',
        icon: 'none'
      });
      console.error('缺少分类ID:', editCategory);
      return;
    }
    
    // 准备提交的分类数据
    const categoryData = {
      name: editCategory.name,
      isActive: editCategory.isActive,
      order: editCategory.order || 0
    };
    
    // 处理图片上传
    let uploadTask;
    if (editCategory.tempImage) {
      uploadTask = this.uploadCategoryImageToCloud(editCategory.tempImage);
    } else if (editCategory.image) {
      // 如果没有新上传的图片，但有原来的图片，保留原图片
      uploadTask = Promise.resolve(editCategory.image);
    } else {
      // 如果没有图片，就使用空字符串
      uploadTask = Promise.resolve('');
    }
    
    uploadTask.then(imageUrl => {
      // 如果有图片URL，添加到分类数据中
      if (imageUrl) {
        categoryData.image = imageUrl;
      }
      
      console.log('更新分类ID:', categoryId);
      console.log('更新分类数据:', categoryData);
      
      // 调用云函数更新分类
      return wx.cloud.callFunction({
        name: 'getCategories',
        data: {
          action: 'update',
          categoryId: categoryId,
          category: categoryData
        }
      });
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        // 关闭编辑表单并刷新分类列表
        this.closeEditCategoryForm();
        this.getCategoriesData();
        
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result?.message || '更新失败',
          icon: 'none'
        });
        console.error('更新分类失败:', res);
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
      console.error('更新分类失败:', err);
    });
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
          wx.showLoading({
            title: '删除中',
          });
          
          // 调用云函数删除分类
          wx.cloud.callFunction({
            name: 'getCategories',
            data: {
              action: 'delete',
              categoryId: category._id || category.id
            }
          }).then(res => {
            wx.hideLoading();
            
            if (res.result && res.result.success) {
              // 删除成功，刷新分类列表
              this.getCategoriesData();
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: res.result?.message || '删除失败',
                icon: 'none'
              });
              console.error('删除分类失败:', res);
            }
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
            console.error('删除分类失败:', err);
          });
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
      wx.showLoading({
        title: '更新中',
      });
      
      // 调用云函数更新分类状态
      wx.cloud.callFunction({
        name: 'getCategories',
        data: {
          action: 'update',
          categoryId: category._id || category.id,
          category: {
            isActive: !category.isActive
          }
        }
      }).then(res => {
        wx.hideLoading();
        
        if (res.result && res.result.success) {
          // 更新本地数据
          const updatedCategories = categories.map(c => {
            if (c.id === id) {
              return { ...c, isActive: !c.isActive };
            }
            return c;
          });
          
          this.setData({
            categories: updatedCategories
          });
          
          wx.showToast({
            title: category.isActive ? '已禁用' : '已启用',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result?.message || '操作失败',
            icon: 'none'
          });
          console.error('更新分类状态失败:', res);
        }
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
        console.error('更新分类状态失败:', err);
      });
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
      const { categories, currentIndex } = this.data;
      
      if (currentIndex !== -1 && categories[currentIndex]) {
        // 获取分类ID
        const categoryId = categories[currentIndex]._id || categories[currentIndex].id;
        
        // 确保分类ID存在
        if (!categoryId) {
          console.error('排序更新失败：缺少分类ID', categories[currentIndex]);
          return;
        }
        
        // 更新被拖动分类的排序
        wx.cloud.callFunction({
          name: 'getCategories',
          data: {
            action: 'update',
            categoryId: categoryId,
            category: {
              order: currentIndex + 1
            }
          }
        }).then(res => {
          if (res.result && res.result.success) {
            wx.showToast({
              title: '排序已更新',
              icon: 'success'
            });
          } else {
            console.error('更新排序失败:', res);
          }
        }).catch(err => {
          console.error('更新排序失败:', err);
        });
      }
      
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