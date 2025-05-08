// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 如果没有openid，返回错误
  if (!openid) {
    return {
      success: false,
      message: '用户未登录'
    }
  }
  
  const { action, productId, quantity, cartItemId } = event
  
  try {
    switch (action) {
      case 'getCart':
        return await getCart(openid)
      case 'addToCart':
        return await addToCart(openid, productId, quantity || 1)
      case 'updateCartItem':
        return await updateCartItem(openid, cartItemId, quantity)
      case 'removeCartItem':
        return await removeCartItem(openid, cartItemId)
      case 'clearCart':
        return await clearCart(openid)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('购物车操作失败', error)
    return {
      success: false,
      message: '购物车操作失败',
      error
    }
  }
}

// 获取购物车
async function getCart(openid) {
  try {
    // 查询用户购物车
    const cartItems = await db.collection('carts')
      .aggregate()
      .match({
        openid
      })
      .lookup({
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'productInfo'
      })
      .replaceRoot({
        newRoot: $.mergeObjects([
          '$$ROOT',
          { product: $.arrayElemAt(['$productInfo', 0]) }
        ])
      })
      .project({
        productInfo: 0
      })
      .end()
    
    // 计算总价
    let totalPrice = 0
    let totalItems = 0
    
    cartItems.list.forEach(item => {
      if (item.product) {
        totalPrice += item.product.price * item.quantity
        totalItems += item.quantity
      }
    })
    
    return {
      success: true,
      data: {
        cartItems: cartItems.list,
        totalPrice,
        totalItems
      }
    }
  } catch (error) {
    console.error('获取购物车失败', error)
    throw error
  }
}

// 添加商品到购物车
async function addToCart(openid, productId, quantity) {
  try {
    // 查询商品是否存在
    const product = await db.collection('products').doc(productId).get()
    if (!product.data) {
      return {
        success: false,
        message: '商品不存在'
      }
    }
    
    // 检查库存 - 增强库存检查
    const stock = product.data.stock !== undefined ? product.data.stock : 0
    if (stock <= 0 || stock < quantity) {
      return {
        success: false,
        message: '商品库存不足'
      }
    }
    
    // 查询购物车中是否已有该商品
    const existingItem = await db.collection('carts')
      .where({
        openid,
        productId
      })
      .get()
    
    if (existingItem.data.length > 0) {
      // 更新数量
      const newQuantity = existingItem.data[0].quantity + quantity
      
      // 再次检查库存 - 增强库存检查
      if (stock < newQuantity) {
        return {
          success: false,
          message: '商品库存不足，已超过可用库存量'
        }
      }
      
      await db.collection('carts')
        .doc(existingItem.data[0]._id)
        .update({
          data: {
            quantity: newQuantity,
            updateTime: new Date()
          }
        })
    } else {
      // 添加新商品到购物车
      await db.collection('carts').add({
        data: {
          openid,
          productId,
          quantity,
          createTime: new Date(),
          updateTime: new Date()
        }
      })
    }
    
    // 返回更新后的购物车
    return await getCart(openid)
  } catch (error) {
    console.error('添加商品到购物车失败', error)
    throw error
  }
}

// 更新购物车商品数量
async function updateCartItem(openid, cartItemId, quantity) {
  try {
    // 获取购物车项
    const cartItem = await db.collection('carts').doc(cartItemId).get()
    if (!cartItem.data || cartItem.data.openid !== openid) {
      return {
        success: false,
        message: '购物车项不存在或无权限'
      }
    }
    
    // 检查库存 - 增强库存检查
    const product = await db.collection('products').doc(cartItem.data.productId).get()
    if (!product.data) {
      return {
        success: false,
        message: '商品不存在'
      }
    }
    
    const stock = product.data.stock !== undefined ? product.data.stock : 0
    if (stock <= 0 || stock < quantity) {
      return {
        success: false,
        message: '商品库存不足，请减少购买数量'
      }
    }
    
    // 更新数量
    await db.collection('carts')
      .doc(cartItemId)
      .update({
        data: {
          quantity,
          updateTime: new Date()
        }
      })
    
    // 返回更新后的购物车
    return await getCart(openid)
  } catch (error) {
    console.error('更新购物车商品数量失败', error)
    throw error
  }
}

// 移除购物车商品
async function removeCartItem(openid, cartItemId) {
  try {
    // 获取购物车项
    const cartItem = await db.collection('carts').doc(cartItemId).get()
    if (!cartItem.data || cartItem.data.openid !== openid) {
      return {
        success: false,
        message: '购物车项不存在或无权限'
      }
    }
    
    // 删除购物车项
    await db.collection('carts').doc(cartItemId).remove()
    
    // 返回更新后的购物车
    return await getCart(openid)
  } catch (error) {
    console.error('移除购物车商品失败', error)
    throw error
  }
}

// 清空购物车
async function clearCart(openid) {
  try {
    await db.collection('carts')
      .where({
        openid
      })
      .remove()
    
    return {
      success: true,
      data: {
        cartItems: [],
        totalPrice: 0,
        totalItems: 0
      }
    }
  } catch (error) {
    console.error('清空购物车失败', error)
    throw error
  }
} 