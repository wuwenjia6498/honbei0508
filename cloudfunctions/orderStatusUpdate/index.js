// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('orderStatusUpdate函数被调用，参数:', event)
  
  // 基本参数验证
  if (!event.orderId || !event.status) {
    return {
      success: false,
      message: '参数不完整'
    }
  }
  
  try {
    // 获取订单信息
    const order = await db.collection('orders').doc(event.orderId).get()
    
    if (!order.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }
    
    // 状态文本映射
    const statusMap = {
      'pending': '待付款',
      'paid': '已付款',
      'processing': '制作中',
      'delivering': '配送中',
      'completed': '已完成',
      'cancelled': '已取消',
      'shipping': '配送中' // 兼容旧状态
    }
    
    // 更新订单进度
    let progress = [...(order.data.progress || [])];
    const now = formatTime(new Date());
    
    // 如果订单有进度记录，则更新进度
    if (progress.length > 0) {
      switch (event.status) {
        case 'paid':
          // 确保进度数组有足够的元素
          if (progress.length > 1) {
            progress[1].completed = true;
            progress[1].time = now;
            progress[1].desc = '您的付款已确认';
          }
          break;
        case 'processing':
          if (progress.length > 2) {
            // 确保付款步骤完成
            if (progress.length > 1) {
              progress[1].completed = true;
              progress[1].time = progress[1].time || now;
              progress[1].desc = '您的付款已确认';
            }
            progress[2].completed = true;
            progress[2].time = now;
            progress[2].desc = '商品正在制作中';
          }
          break;
        case 'delivering':
        case 'shipping': // 兼容旧状态
          if (progress.length > 3) {
            // 确保之前步骤完成
            if (progress.length > 1) {
              progress[1].completed = true;
              progress[1].time = progress[1].time || now;
              progress[1].desc = '您的付款已确认';
            }
            if (progress.length > 2) {
              progress[2].completed = true;
              progress[2].time = progress[2].time || now;
              progress[2].desc = '商品制作完成';
            }
            progress[3].completed = true;
            progress[3].time = now;
            progress[3].desc = '商品正在配送中';
          }
          break;
        case 'completed':
          if (progress.length > 4) {
            // 确保之前步骤完成
            if (progress.length > 1) {
              progress[1].completed = true;
              progress[1].time = progress[1].time || now;
              progress[1].desc = '您的付款已确认';
            }
            if (progress.length > 2) {
              progress[2].completed = true;
              progress[2].time = progress[2].time || now;
              progress[2].desc = '商品制作完成';
            }
            if (progress.length > 3) {
              progress[3].completed = true;
              progress[3].time = progress[3].time || now;
              progress[3].desc = '商品已送达';
            }
            progress[4].completed = true;
            progress[4].time = now;
            progress[4].desc = '订单已完成';
          }
          break;
        case 'cancelled':
          // 取消订单时不修改进度，只添加取消信息
          break;
      }
    }
    
    // 更新订单状态
    const updateData = {
      status: event.status,
      statusText: statusMap[event.status] || '未知状态',
      updateTime: db.serverDate()
    };
    
    // 如果有进度信息并且不是空数组，则更新进度
    if (progress && progress.length > 0) {
      updateData.progress = progress;
    }
    
    // 如果状态为paid，记录支付时间
    if (event.status === 'paid') {
      updateData.paymentTime = db.serverDate();
    }
    
    // 执行更新
    await db.collection('orders').doc(event.orderId).update({
      data: updateData
    });
    
    // 如果订单取消，恢复库存
    if (event.status === 'cancelled' && order.data.status !== 'cancelled') {
      if (order.data.products && Array.isArray(order.data.products)) {
        for (const product of order.data.products) {
          if (product.productId && product.quantity) {
            try {
              await db.collection('products').doc(product.productId).update({
                data: {
                  stock: _.inc(product.quantity)
                }
              });
            } catch (stockErr) {
              console.error('恢复商品库存失败:', stockErr);
              // 继续处理其他产品，不中断流程
            }
          }
        }
      }
    }
    
    // 获取更新后的订单
    const updatedOrder = await db.collection('orders').doc(event.orderId).get();
    
    return {
      success: true,
      message: '状态更新成功',
      data: updatedOrder.data
    };
  } catch (err) {
    console.error('状态更新失败:', err);
    return {
      success: false,
      message: '状态更新失败',
      error: err.message
    };
  }
};

// 工具函数：数字补零
function padZero(num) {
  return num.toString().padStart(2, '0');
}

// 工具函数：格式化时间
function formatTime(date) {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hour = padZero(date.getHours());
  const minute = padZero(date.getMinutes());
  const second = padZero(date.getSeconds());
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
} 