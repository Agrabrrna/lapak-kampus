const prisma = require('../services/db');
const { coreApi } = require('../services/midtrans');
const crypto = require('crypto');

// Handle Midtrans Webhook
exports.handleNotification = async (req, res) => {
  try {
    const notification = req.body;
    
    // Verify signature key
    const orderId = notification.order_id;
    const statusCode = notification.status_code;
    const grossAmount = notification.gross_amount;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const signatureKey = notification.signature_key;
    
    const hash = crypto.createHash('sha512').update(orderId + statusCode + grossAmount + serverKey).digest('hex');
    
    if (hash !== signatureKey) {
      return res.status(403).json({ error: 'Invalid signature key' });
    }
    
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    
    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { orderId: orderId },
      include: { order: true }
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    let newPaymentStatus = payment.status;
    let newOrderStatus = payment.order.status;

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        newPaymentStatus = 'PENDING';
      } else if (fraudStatus === 'accept') {
        newPaymentStatus = 'PAID';
        newOrderStatus = 'DIPROSES';
      }
    } else if (transactionStatus === 'settlement') {
      newPaymentStatus = 'PAID';
      newOrderStatus = 'DIPROSES';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      newPaymentStatus = transactionStatus === 'expire' ? 'EXPIRED' : 'FAILED';
      // We don't automatically cancel the order here, or we could. Let's just update Payment.
    } else if (transactionStatus === 'pending') {
      newPaymentStatus = 'PENDING';
    }

    // Update Payment and Order in transaction
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { 
          status: newPaymentStatus,
          paidAt: newPaymentStatus === 'PAID' ? new Date() : payment.paidAt
        }
      });
      
      if (newOrderStatus !== payment.order.status) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: newOrderStatus }
        });
        
        // Notify buyer and seller if paid
        if (newOrderStatus === 'DIPROSES') {
          await tx.notification.createMany({
            data: [
              { userId: payment.order.buyerId, title: 'Pembayaran Berhasil', message: `Pembayaran pesanan ${orderId} telah diverifikasi. Pesanan sedang diproses.` },
              { userId: payment.order.sellerId, title: 'Pesanan Telah Dibayar', message: `Pesanan ${orderId} telah dibayar oleh pembeli. Silakan kirimkan barang.` }
            ]
          });
        }
      }
    });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Midtrans Notification Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Handle manual check from user
exports.checkStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { order: true }
    });
    
    if (!payment) {
      req.flash('error_msg', 'Data pembayaran tidak ditemukan.');
      return res.redirect(req.get('Referrer') || '/orders/my-orders');
    }

    if (payment.status === 'PAID') {
      req.flash('success_msg', 'Pembayaran sudah terkonfirmasi.');
      return res.redirect(req.get('Referrer') || '/orders/my-orders');
    }

    // Fetch from Midtrans API
    const response = await coreApi.transaction.status(orderId);
    
    if (response) {
      const transactionStatus = response.transaction_status;
      const fraudStatus = response.fraud_status;

      let newPaymentStatus = payment.status;
      let newOrderStatus = payment.order.status;

      if (transactionStatus === 'capture') {
        if (fraudStatus === 'accept') {
          newPaymentStatus = 'PAID';
          newOrderStatus = 'DIPROSES';
        }
      } else if (transactionStatus === 'settlement') {
        newPaymentStatus = 'PAID';
        newOrderStatus = 'DIPROSES';
      } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
        newPaymentStatus = transactionStatus === 'expire' ? 'EXPIRED' : 'FAILED';
      }

      if (newPaymentStatus !== payment.status) {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { 
              status: newPaymentStatus,
              paidAt: newPaymentStatus === 'PAID' ? new Date() : payment.paidAt
            }
          });
          
          if (newOrderStatus !== payment.order.status) {
            await tx.order.update({
              where: { id: orderId },
              data: { status: newOrderStatus }
            });
            
            if (newOrderStatus === 'DIPROSES') {
              await tx.notification.createMany({
                data: [
                  { userId: payment.order.buyerId, title: 'Pembayaran Berhasil', message: `Pembayaran pesanan ${orderId} telah diverifikasi.` },
                  { userId: payment.order.sellerId, title: 'Pesanan Telah Dibayar', message: `Pesanan ${orderId} telah dibayar oleh pembeli.` }
                ]
              });
            }
          }
        });
        req.flash('success_msg', `Status pembayaran diperbarui: ${newPaymentStatus}`);
      } else {
        req.flash('success_msg', `Status belum berubah (masih ${newPaymentStatus}). Silakan tunggu beberapa saat.`);
      }
    }

    res.redirect(req.get('Referrer') || '/orders/my-orders');
  } catch (error) {
    console.error('Check Status Error:', error);
    // Usually means transaction not found in Midtrans
    req.flash('error_msg', 'Gagal menarik status dari Midtrans. Pastikan transaksi benar.');
    res.redirect(req.get('Referrer') || '/orders/my-orders');
  }
};
