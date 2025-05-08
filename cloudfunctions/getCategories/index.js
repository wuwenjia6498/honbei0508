// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('getCategories函数被调用，参数:', event)
  
  const { categoryId, action } = event
  
  // 根据action执行不同操作
  if (action === 'add') {
    return await addCategory(event.category)
  } else if (action === 'update') {
    return await updateCategory(event.categoryId, event.category)
  } else if (action === 'delete') {
    return await deleteCategory(categoryId)
  }
  
  try {
    // 如果传入了categoryId，返回特定分类信息及其商品数量
    if (categoryId) {
      console.log(`请求获取分类ID: ${categoryId} 的信息`)
      
      // 获取分类信息
      const categoryResult = await db.collection('categories').doc(categoryId).get()
      
      if (!categoryResult.data) {
        console.error(`未找到ID为 ${categoryId} 的分类`)
        return {
          success: false,
          message: '未找到指定分类'
        }
      }
      
      // 查询该分类下的实际商品数量
      const countResult = await db.collection('products').where({
        category: categoryResult.data.name
      }).count()
      
      const actualProductCount = countResult.total
      console.log(`分类 "${categoryResult.data.name}" 实际商品数量: ${actualProductCount}`)
      
      // 如果数据库中的商品数量与实际不符，则更新
      if (categoryResult.data.productCount !== actualProductCount) {
        console.log(`更新分类 "${categoryResult.data.name}" 的商品数量从 ${categoryResult.data.productCount || 0} 到 ${actualProductCount}`)
        
        await db.collection('categories').doc(categoryId).update({
          data: {
            productCount: actualProductCount,
            updateTime: db.serverDate()
          }
        })
        
        // 更新返回数据中的商品数量
        categoryResult.data.productCount = actualProductCount
      }
      
      return {
        success: true,
        data: categoryResult.data
      }
    } 
    // 获取所有分类并更新商品数量
    else {
      console.log('请求获取所有分类列表')
      
      // 获取所有分类 - 修复排序字段从'sort'改为'order'
      const categoriesResult = await db.collection('categories').orderBy('order', 'asc').get()
      
      if (!categoriesResult.data || categoriesResult.data.length === 0) {
        console.log('未找到任何分类记录')
        return {
          success: true,
          data: []
        }
      }
      
      // 更新每个分类的商品数量
      const updatedCategories = await Promise.all(categoriesResult.data.map(async (category) => {
        // 查询该分类下的实际商品数量
        const countResult = await db.collection('products').where({
          category: category.name
        }).count()
        
        const actualProductCount = countResult.total
        console.log(`分类 "${category.name}" 实际商品数量: ${actualProductCount}`)
        
        // 如果数据库中的商品数量与实际不符，则更新
        if (category.productCount !== actualProductCount) {
          console.log(`更新分类 "${category.name}" 的商品数量从 ${category.productCount || 0} 到 ${actualProductCount}`)
          
          await db.collection('categories').doc(category._id).update({
            data: {
              productCount: actualProductCount,
              updateTime: db.serverDate()
            }
          })
        }
        
        // 更新返回数据中的商品数量
        return {
          ...category,
          productCount: actualProductCount
        }
      }))
      
      return {
        success: true,
        data: updatedCategories
      }
    }
  } catch (error) {
    console.error('获取分类信息失败:', error)
    return {
      success: false,
      message: '获取分类信息失败',
      error: error
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