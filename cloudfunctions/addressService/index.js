// 云函数入口文件
const cloud = require('wx-server-sdk')

// 确保云环境正确初始化
try {
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
  console.log('云环境初始化成功')
} catch (error) {
  console.error('云环境初始化失败:', error)
}

const db = cloud.database()
const addressCollection = db.collection('addresses')
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('addressService 接收到调用，完整参数:', JSON.stringify(event))
  console.log('addressService 操作类型:', event.action)
  
  if (event.action === 'addAddress') {
    console.log('添加地址，参数详情:', JSON.stringify(event.address))
    if (event.address) {
      console.log('添加地址，姓名字段:', event.address.name, '类型:', typeof event.address.name)
    }
  }
  
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID
  console.log('当前用户OPENID:', OPENID)
  
  const { action } = event

  // 检查用户权限
  const checkUserPermission = async (addressId) => {
    const address = await addressCollection.doc(addressId).get()
    if (!address.data) {
      return { success: false, message: '地址不存在' }
    }
    if (address.data._openid !== OPENID) {
      return { success: false, message: '无权操作该地址' }
    }
    return { success: true, data: address.data }
  }

  // 根据不同的action执行不同的操作
  try {
    switch (action) {
      case 'getAddresses':
        return await getAddresses(OPENID)
      case 'getAddressById':
        return await getAddressById(event.addressId, OPENID, checkUserPermission)
      case 'addAddress':
        return await addAddress(event.address, OPENID, event)
      case 'updateAddress':
        return await updateAddress(event.addressId, event.address, OPENID, checkUserPermission)
      case 'deleteAddress':
        return await deleteAddress(event.addressId, OPENID, checkUserPermission)
      case 'setDefaultAddress':
        return await setDefaultAddress(event.addressId, OPENID, checkUserPermission)
      default:
        console.error('未知操作:', action)
        return {
          code: -1,
          message: '未知操作: ' + action
        }
    }
  } catch (error) {
    console.error('处理请求时发生异常:', error)
    return {
      code: -1,
      message: '系统错误: ' + error.message
    }
  }
}

// 获取用户的所有地址
async function getAddresses(OPENID) {
  console.log('获取地址列表, openid:', OPENID)
  try {
    const addresses = await addressCollection
      .where({
        _openid: OPENID
      })
      .orderBy('isDefault', 'desc')
      .orderBy('createTime', 'desc')
      .get()
    
    console.log('获取地址列表成功, 数量:', addresses.data.length)
    return {
      code: 0,
      data: addresses.data
    }
  } catch (err) {
    console.error('获取地址列表失败:', err)
    return {
      code: -1,
      message: '获取地址列表失败: ' + err.message
    }
  }
}

// 获取单个地址详情
async function getAddressById(addressId, OPENID, checkUserPermission) {
  console.log('获取地址详情, id:', addressId, 'openid:', OPENID)
  try {
    const permission = await checkUserPermission(addressId)
    if (!permission.success) {
      return permission
    }
    
    return {
      code: 0,
      data: permission.data
    }
  } catch (err) {
    console.error('获取地址详情失败:', err)
    return {
      code: -1,
      message: '获取地址详情失败: ' + err.message
    }
  }
}

// 添加新地址
async function addAddress(address, OPENID, event) {
  console.log('添加地址, 数据:', JSON.stringify(address), 'openid:', OPENID)
  console.log('添加地址, 姓名字段:', address ? address.name : '未提供地址对象')
  
  try {
    if (!address) {
      return {
        code: -1,
        message: '地址数据不能为空'
      }
    }
    
    console.log('校验前的地址数据:', JSON.stringify({
      name: address.name, 
      phone: address.phone,
      region: address.region,
      detailAddress: address.detailAddress
    }))

    // 校验数据
    const name = address.name || ''
    if (!name || name.trim() === '') {
      return { code: -1, message: '收货人姓名不能为空' }
    }
    if (!address.phone) {
      return { code: -1, message: '手机号码不能为空' }
    }
    if (!address.region || !Array.isArray(address.region) || address.region.length < 3) {
      return { code: -1, message: '地区信息不完整' }
    }
    if (!address.detailAddress) {
      return { code: -1, message: '详细地址不能为空' }
    }
    
    // 构造新地址数据
    const newAddress = {
      _openid: OPENID,
      name: address.name,
      phone: address.phone,
      region: address.region,
      detailAddress: address.detailAddress,
      isDefault: !!address.isDefault,
      createTime: db.serverDate()
    }
    
    console.log('准备保存新地址:', JSON.stringify(newAddress))
    
    // 如果设置为默认地址，则取消其他默认地址
    if (newAddress.isDefault) {
      console.log('设置为默认地址，先将其他地址设为非默认')
      try {
        await addressCollection
          .where({
            _openid: OPENID,
            isDefault: true
          })
          .update({
            data: {
              isDefault: false
            }
          })
      } catch (error) {
        console.error('更新其他地址默认状态失败:', error)
        // 继续执行，不因此中断
      }
    }
    
    // 插入新地址
    console.log('开始添加新地址')
    const result = await addressCollection.add({
      data: newAddress
    })
    
    console.log('添加地址成功, id:', result._id)
    return {
      code: 0,
      data: {
        id: result._id
      },
      message: '添加成功'
    }
  } catch (err) {
    console.error('添加地址过程中发生异常:', err)
    return {
      code: -1,
      message: '添加地址失败: ' + err.message,
      error: err
    }
  }
}

// 更新地址
async function updateAddress(addressId, address, OPENID, checkUserPermission) {
  console.log('更新地址, 数据:', JSON.stringify(address), 'openid:', OPENID)
  
  try {
    if (!addressId || !address) {
      return {
        code: -1,
        message: '地址ID和数据不能为空'
      }
    }

    const permission = await checkUserPermission(addressId)
    if (!permission.success) {
      return permission
    }
    
    // 校验数据
    const name = address.name || ''
    if (!name || name.trim() === '') {
      return { code: -1, message: '收货人姓名不能为空' }
    }
    if (!address.phone) {
      return { code: -1, message: '手机号码不能为空' }
    }
    if (!address.region || !Array.isArray(address.region) || address.region.length < 3) {
      return { code: -1, message: '地区信息不完整' }
    }
    if (!address.detailAddress) {
      return { code: -1, message: '详细地址不能为空' }
    }
    
    // 构造更新数据
    const updateData = {
      name: address.name,
      phone: address.phone,
      region: address.region,
      detailAddress: address.detailAddress,
      isDefault: !!address.isDefault,
      updateTime: db.serverDate()
    }
    
    // 如果设置为默认地址，则取消其他默认地址
    if (updateData.isDefault) {
      try {
        await addressCollection
          .where({
            _openid: OPENID,
            _id: _.neq(addressId),
            isDefault: true
          })
          .update({
            data: {
              isDefault: false
            }
          })
      } catch (error) {
        console.error('更新其他地址默认状态失败:', error)
        // 继续执行，不因此中断
      }
    }
    
    // 更新地址
    const result = await addressCollection.doc(addressId).update({
      data: updateData
    })
    
    return {
      code: 0,
      data: {
        updated: result.stats.updated
      },
      message: '更新成功'
    }
  } catch (err) {
    console.error('更新地址失败:', err)
    return {
      code: -1,
      message: '更新地址失败: ' + err.message
    }
  }
}

// 删除地址
async function deleteAddress(addressId, OPENID, checkUserPermission) {
  console.log('删除地址, id:', addressId, 'openid:', OPENID)
  
  try {
    if (!addressId) {
      return {
        code: -1,
        message: '地址ID不能为空'
      }
    }

    const permission = await checkUserPermission(addressId)
    if (!permission.success) {
      return permission
    }
    
    // 删除地址
    const result = await addressCollection.doc(addressId).remove()
    
    return {
      code: 0,
      data: {
        deleted: result.stats.removed
      },
      message: '删除成功'
    }
  } catch (err) {
    console.error('删除地址失败:', err)
    return {
      code: -1,
      message: '删除地址失败: ' + err.message
    }
  }
}

// 设置默认地址
async function setDefaultAddress(addressId, OPENID, checkUserPermission) {
  console.log('设置默认地址, id:', addressId, 'openid:', OPENID)
  
  try {
    if (!addressId) {
      return {
        code: -1,
        message: '地址ID不能为空'
      }
    }

    const permission = await checkUserPermission(addressId)
    if (!permission.success) {
      return permission
    }
    
    // 先将所有地址设为非默认
    try {
      await addressCollection
        .where({
          _openid: OPENID
        })
        .update({
          data: {
            isDefault: false
          }
        })
    } catch (error) {
      console.error('重置默认地址状态失败:', error)
      // 继续执行，不因此中断
    }
    
    // 设置当前地址为默认
    const result = await addressCollection.doc(addressId).update({
      data: {
        isDefault: true,
        updateTime: db.serverDate()
      }
    })
    
    return {
      code: 0,
      data: {
        updated: result.stats.updated
      },
      message: '设置默认地址成功'
    }
  } catch (err) {
    console.error('设置默认地址失败:', err)
    return {
      code: -1,
      message: '设置默认地址失败: ' + err.message
    }
  }
} 