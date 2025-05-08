// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云环境
cloud.init({
  env: 'cloud1-3g9nsaj9f3a1b0ed'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 解构操作参数
  const { action, category, categoryId } = event
  
  // 根据action执行不同操作
  switch (action) {
    case 'add':
      return await addCategory(category)
    case 'update':
      return await updateCategory(categoryId, category)
    case 'delete':
      return await deleteCategory(categoryId)
    case 'list':
      return await listCategories(event)
    default:
      return {
        success: false,
        message: '无效的操作类型'
      }
  }
}

/**
 * 添加分类
 * @param {Object} category - 分类数据
 */
async function addCategory(category) {
  try {
    if (!category || !category.name) {
      return {
        success: false,
        message: '分类数据不完整'
      }
    }
    
    // 检查分类名称是否已存在
    const existingCategory = await db.collection('categories').where({
      name: category.name
    }).get()
    
    if (existingCategory.data.length > 0) {
      return {
        success: false,
        message: '分类名称已存在'
      }
    }
    
    // 设置默认值
    if (!category.order) {
      // 获取最大排序值
      const maxOrderResult = await db.collection('categories')
        .orderBy('order', 'desc')
        .limit(1)
        .get()
      
      const maxOrder = maxOrderResult.data.length > 0 ? maxOrderResult.data[0].order : 0
      category.order = maxOrder + 1
    }
    
    if (category.isActive === undefined) {
      category.isActive = true
    }
    
    if (!category.image) {
      category.image = '/assets/images/products/photo-1517686469429-8bdb88b9f907.jpeg'
    }
    
    if (!category.productCount) {
      category.productCount = 0
    }
    
    // 添加创建时间
    category.createTime = db.serverDate()
    category.updateTime = db.serverDate()
    
    // 添加到数据库
    const result = await db.collection('categories').add({
      data: category
    })
    
    return {
      success: true,
      message: '添加分类成功',
      categoryId: result._id
    }
  } catch (error) {
    console.error('添加分类失败:', error)
    return {
      success: false,
      message: '添加分类失败: ' + error.message
    }
  }
}

/**
 * 更新分类
 * @param {String} categoryId - 分类ID
 * @param {Object} category - 更新的分类数据
 */
async function updateCategory(categoryId, category) {
  try {
    if (!categoryId) {
      return {
        success: false,
        message: '缺少分类ID'
      }
    }
    
    if (!category) {
      return {
        success: false,
        message: '缺少更新数据'
      }
    }
    
    // 如果更新的是名称，检查名称是否存在
    if (category.name) {
      const existingCategory = await db.collection('categories').where({
        name: category.name,
        _id: _.neq(categoryId)
      }).get()
      
      if (existingCategory.data.length > 0) {
        return {
          success: false,
          message: '分类名称已存在'
        }
      }
    }
    
    // 添加更新时间
    category.updateTime = db.serverDate()
    
    // 更新数据库
    await db.collection('categories').doc(categoryId).update({
      data: category
    })
    
    return {
      success: true,
      message: '更新分类成功'
    }
  } catch (error) {
    console.error('更新分类失败:', error)
    return {
      success: false,
      message: '更新分类失败: ' + error.message
    }
  }
}

/**
 * 删除分类
 * @param {String} categoryId - 分类ID
 */
async function deleteCategory(categoryId) {
  try {
    if (!categoryId) {
      return {
        success: false,
        message: '缺少分类ID'
      }
    }
    
    // 检查分类下是否有商品
    const category = await db.collection('categories').doc(categoryId).get()
    if (category.data.productCount > 0) {
      return {
        success: false,
        message: `该分类下还有${category.data.productCount}个商品，请先移除或重新分类这些商品`
      }
    }
    
    // 从数据库删除
    await db.collection('categories').doc(categoryId).remove()
    
    return {
      success: true,
      message: '删除分类成功'
    }
  } catch (error) {
    console.error('删除分类失败:', error)
    return {
      success: false,
      message: '删除分类失败: ' + error.message
    }
  }
}

/**
 * 获取分类列表
 * @param {Object} params - 查询参数
 */
async function listCategories(params = {}) {
  try {
    const { onlyActive = false } = params
    
    // 构建查询条件
    const condition = {}
    
    // 只显示启用的分类
    if (onlyActive) {
      condition.isActive = true
    }
    
    // 获取所有分类，按排序字段排序
    const list = await db.collection('categories')
      .where(condition)
      .orderBy('order', 'asc')
      .get()
    
    return {
      success: true,
      data: list.data
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
    return {
      success: false,
      message: '获取分类列表失败: ' + error.message
    }
  }
} 