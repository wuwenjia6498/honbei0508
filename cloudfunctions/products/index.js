// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 解构操作参数
  const { action, product, productId } = event
  
  // 根据action执行不同操作
  switch (action) {
    case 'add':
      return await addProduct(product)
    case 'update':
      return await updateProduct(productId, product)
    case 'delete':
      return await deleteProduct(productId)
    default:
      return {
        success: false,
        message: '无效的操作类型'
      }
  }
}

/**
 * 添加商品
 * @param {Object} product - 商品数据
 */
async function addProduct(product) {
  try {
    if (!product || !product.name) {
      return {
        success: false,
        message: '商品数据不完整'
      }
    }
    
    // 添加创建时间
    if (!product.createTime) {
      product.createTime = db.serverDate()
    }
    
    // 添加到数据库
    const result = await db.collection('products').add({
      data: product
    })
    
    // 更新分类商品数量
    if (product.category) {
      await updateCategoryProductCount(product.category);
    }
    
    return {
      success: true,
      message: '添加商品成功',
      productId: result._id
    }
  } catch (error) {
    console.error('添加商品失败:', error)
    return {
      success: false,
      message: '添加商品失败: ' + error.message
    }
  }
}

/**
 * 更新商品
 * @param {String} productId - 商品ID
 * @param {Object} product - 更新的商品数据
 */
async function updateProduct(productId, product) {
  try {
    if (!productId) {
      return {
        success: false,
        message: '缺少商品ID'
      }
    }
    
    if (!product) {
      return {
        success: false,
        message: '缺少更新数据'
      }
    }
    
    // 获取原来的商品数据
    const oldProduct = await db.collection('products').doc(productId).get();
    const oldCategory = oldProduct.data.category;
    
    // 添加更新时间
    if (!product.updateTime) {
      product.updateTime = db.serverDate()
    }
    
    // 更新数据库
    await db.collection('products').doc(productId).update({
      data: product
    })
    
    // 如果分类发生变化，则更新两个分类的商品数量
    if (product.category && oldCategory && product.category !== oldCategory) {
      await updateCategoryProductCount(oldCategory);
      await updateCategoryProductCount(product.category);
    } else if (product.category) {
      // 如果分类没变，但确保分类商品数量正确
      await updateCategoryProductCount(product.category);
    }
    
    return {
      success: true,
      message: '更新商品成功'
    }
  } catch (error) {
    console.error('更新商品失败:', error)
    return {
      success: false,
      message: '更新商品失败: ' + error.message
    }
  }
}

/**
 * 删除商品
 * @param {String} productId - 商品ID
 */
async function deleteProduct(productId) {
  try {
    if (!productId) {
      return {
        success: false,
        message: '缺少商品ID'
      }
    }
    
    // 获取商品信息，以便更新分类
    const product = await db.collection('products').doc(productId).get();
    const category = product.data.category;
    
    // 从数据库删除
    await db.collection('products').doc(productId).remove()
    
    // 更新分类商品数量
    if (category) {
      await updateCategoryProductCount(category);
    }
    
    return {
      success: true,
      message: '删除商品成功'
    }
  } catch (error) {
    console.error('删除商品失败:', error)
    return {
      success: false,
      message: '删除商品失败: ' + error.message
    }
  }
}

/**
 * 更新分类下的商品数量
 * @param {String} categoryName - 分类名称
 */
async function updateCategoryProductCount(categoryName) {
  try {
    console.log(`正在更新分类 "${categoryName}" 的商品数量`)
    
    // 查询该分类下的商品数量
    const countResult = await db.collection('products').where({
      category: categoryName
    }).count()
    
    console.log(`分类 "${categoryName}" 的商品数量为: ${countResult.total}`)
    
    // 查询该分类记录
    const categoryQuery = await db.collection('categories').where({
      name: categoryName
    }).get()
    
    if (categoryQuery.data.length === 0) {
      console.error(`找不到名为 "${categoryName}" 的分类`)
      return
    }
    
    const categoryId = categoryQuery.data[0]._id
    
    // 更新分类的商品数量
    await db.collection('categories').doc(categoryId).update({
      data: {
        productCount: countResult.total,
        updateTime: db.serverDate()
      }
    })
    
    console.log(`已成功更新分类 "${categoryName}" 的商品数量为 ${countResult.total}`)
    return true
  } catch (error) {
    console.error('更新分类商品数量失败:', error)
    return false
  }
} 