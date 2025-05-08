const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 用户管理云函数
exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'getUsers':
      return await getUsers(event)
    case 'updateUserStatus':
      return await updateUserStatus(event.data || event)
    case 'upgradeUserLevel':
      return await upgradeUserLevel(event.data || event)
    case 'searchUsers':
      return await searchUsers(event.data || event)
    case 'getUserCounts':
      return await getUserCounts()
    case 'getUserDetail':
      return await getUserDetail(event.data || event)
    case 'updateUser':
      return await updateUser(event.data || event)
    case 'deleteUser':
      return await deleteUser(event.data || event)
    default:
      return {
        success: false,
        message: '未知的操作类型'
      }
  }
}

// 获取用户详情
async function getUserDetail({ userId }) {
  try {
    if (!userId) {
      return {
        success: false,
        message: '用户ID不能为空'
      }
    }

    const res = await db.collection('users').doc(userId).get();
    
    if (!res.data) {
      return {
        success: false,
        message: '未找到该用户'
      }
    }

    return {
      success: true,
      data: res.data
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

// 更新用户信息
async function updateUser({ userId, userData }) {
  try {
    if (!userId) {
      return {
        success: false,
        message: '用户ID不能为空'
      }
    }

    if (!userData) {
      return {
        success: false,
        message: '用户数据不能为空'
      }
    }

    // 验证必要字段
    if (!userData.nickname || !userData.phone) {
      return {
        success: false,
        message: '昵称和手机号不能为空'
      }
    }

    // 过滤只允许更新特定字段
    const updateData = {
      nickname: userData.nickname,
      phone: userData.phone,
      level: userData.level,
      status: userData.status,
      updateTime: new Date()
    }

    await db.collection('users').doc(userId).update({
      data: updateData
    });

    return {
      success: true,
      message: '更新用户信息成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

// 获取用户列表
async function getUsers(event) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      filter = 'all', 
      sort = 'registerTime', 
      order = 'desc',
      keyword = '' 
    } = event;
    
    console.log('云函数接收到的请求:', event);
    console.log('搜索关键词:', keyword);
    
    let query = db.collection('users');
    
    // 根据筛选条件过滤
    if (filter === 'premium' || filter === 'vip') {
      query = query.where({ level: 'premium' });
    } else if (filter === 'normal') {
      query = query.where({ level: 'normal' });
    } else if (filter === 'disabled') {
      query = query.where({ status: 'inactive' });
    }

    // 搜索关键词
    if (keyword && keyword.trim() !== '') {
      console.log('应用搜索条件:', keyword);
      
      // 转义正则表达式中的特殊字符
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      console.log('转义后的关键词:', escapedKeyword);
      
      // 使用正则表达式进行模糊搜索
      const regExp = db.RegExp({
        regexp: escapedKeyword,
        options: 'i'
      });
      
      // 调试搜索条件
      console.log('构建正则表达式:', regExp);
      
      try {
        // 如果已经有筛选条件，需要使用复合查询
        if (filter !== 'all') {
          console.log('使用复合查询 (AND+OR)');
          // 已有筛选条件的情况下追加搜索条件
          query = query.where(_.and([
            // 保持现有条件不变
            query._where,
            // 添加搜索条件
            _.or([
              { nickname: regExp },
              { phone: regExp }
            ])
          ]));
        } else {
          console.log('使用简单OR查询');
          // 没有筛选条件的简单搜索
          query = query.where(_.or([
            { nickname: regExp },
            { phone: regExp }
          ]));
        }
        
        console.log('查询条件设置成功');
      } catch (err) {
        console.error('设置查询条件时出错:', err);
        // 使用更简单的方式重试
        query = db.collection('users').where({
          nickname: regExp
        });
        console.log('已降级到仅搜索昵称');
      }
    }

    // 获取总数
    console.log('开始获取总记录数...');
    const countResult = await query.count();
    const total = countResult.total;
    console.log('总记录数:', total);

    // 排序
    console.log(`按${sort}字段${order}序排序`);
    query = query.orderBy(sort, order);

    // 分页
    const pageSize = limit || 10;
    const skipCount = (page - 1) * pageSize;
    console.log(`分页设置: 跳过${skipCount}条, 取${pageSize}条`);
    
    const res = await query
      .skip(skipCount)
      .limit(pageSize)
      .get();
    
    console.log('查询结果数量:', res.data.length);
    console.log('查询结果示例:', res.data.length > 0 ? res.data[0] : '无数据');

    return {
      success: true,
      data: res.data,
      total: total
    };
  } catch (error) {
    console.error('查询用户出错:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// 更新用户状态
async function updateUserStatus({ userId, status }) {
  try {
    await db.collection('users').doc(userId).update({
      data: { status }
    })

    return {
      success: true,
      message: '用户状态更新成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

// 升级用户等级
async function upgradeUserLevel({ userId }) {
  try {
    await db.collection('users').doc(userId).update({
      data: { level: 'premium' }
    })

    return {
      success: true,
      message: '用户等级升级成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

// 搜索用户
async function searchUsers({ keyword }) {
  try {
    const res = await db.collection('users')
      .where(_.or([
        { nickname: db.RegExp({ regexp: keyword, options: 'i' }) },
        { phone: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]))
      .get()

    return {
      success: true,
      data: res.data
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

// 获取用户数量统计
async function getUserCounts() {
  try {
    const counts = await Promise.all([
      db.collection('users').count(),
      db.collection('users').where({ level: 'normal' }).count(),
      db.collection('users').where({ level: 'premium' }).count(),
      db.collection('users').where({ status: 'inactive' }).count()
    ])

    return {
      success: true,
      data: counts.map(count => count.total)
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

// 删除用户
async function deleteUser({ userId }) {
  try {
    if (!userId) {
      return {
        success: false,
        message: '用户ID不能为空'
      }
    }

    await db.collection('users').doc(userId).remove();

    return {
      success: true,
      message: '删除用户成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
} 