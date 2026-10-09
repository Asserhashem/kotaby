require('dotenv').config(); // تحميل المتغيرات السرية من ملف .env
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mailer  = require('nodemailer');
const app = express();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'asserhashem82@gmail.com',
        pass: 'utzc mojs sxxg beou'
    }
});
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // بيسمح للسيرفر يعرض الصور وملفات الـ CSS المجاورة فوراً
let orders = [];

// قاعدة بيانات البرومو كود
let promoCodesDB = {
    'NasserVIP26': { used: false }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// استقبال طلب الشراء
app.post('/api/buy', async (req, res) => {
    const { buyerName, buyerEmail, buyerPhone, userLocation, promoCode } = req.body;
    
    let isPromoValid = false;
    let cleanCode = promoCode ? promoCode.trim() : '';

    if (cleanCode) {
        if (promoCodesDB[cleanCode]) {
            if (!promoCodesDB[cleanCode].used) {
                isPromoValid = true;
                promoCodesDB[cleanCode].used = true;
            } else {
                return res.json({ success: false, message: 'عذراً، هذا البرومو كود تم استخدامه من قبل وغير صالح!' });
            }
        } else {
            return res.json({ success: false, message: 'عذراً، البرومو كود الذي أدخلته غير صحيح!' });
        }
    }

    const newOrder = {
        id: Date.now(),
        buyerName,
        buyerEmail,
        buyerPhone: userLocation === 'abroad' ? 'دفع دولي (عبر إنستا باي الدولي / Wise)' : buyerPhone,
        promoUsed: isPromoValid ? cleanCode : 'بدون برومو كود',
        status: isPromoValid ? 'approved' : 'pending',
        createdAt: new Date().toLocaleString('ar-EG')
    };

    orders.push(newOrder);

    if (isPromoValid) {
        try {
            let testAccount = await nodemailer.createTestAccount();
            let transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });

            let downloadLink = `http://localhost:3000/download/${newOrder.id}`;

            let info = await transporter.sendMail({
                from: '"منصة كتابي" <noreply@kotaby.com>',
                to: newOrder.buyerEmail,
                subject: 'هدية خاصة! نسختك المجانية من كتاب "خلف جدار العادية"',
                html: `
                    <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb; color: #111;">
                        <h2 style="color: #f59e0b;">أهلاً بك يا ${newOrder.buyerName}</h2>
                        <p>تهانينا! تم تفعيل برومو كود <b>${cleanCode}</b> بنجاح.</p>
                        <p>يمكنك تحميل نسختك الرقمية من الكتاب فوراً عبر الرابط التالي:</p>
                        <a href="${downloadLink}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">تحميل الكتاب الآن 📥</a>
                    </div>
                `,
            });
            console.log("🎁 تم تفعيل البرومو وإرسال الكتاب أوتوماتيك لـ: %s", newOrder.buyerEmail);
            console.log("🔗 رابط معاينة إيميل البرومو: %s", nodemailer.getTestMessageUrl(info));
        } catch (err) {
            console.error("خطأ في إرسال إيميل البرومو:", err);
        }
    }

    res.json({ success: true, orderId: newOrder.id, autoApproved: isPromoValid });
});

// صفحة تسجيل الدخول للوحة التحكم (لو مش عامل Login، يظهر له نموذج كتابة الباسورد)
app.get('/admin-dashboard', (req, res) => {
    const passwordQuery = req.query.password;

    // التحقق من الباسورد القادم من ملف .env الخفي
    if (passwordQuery !== process.env.ADMIN_PASSWORD) {
        return res.send(`
            <html lang="ar" dir="rtl">
            <head><meta charset="UTF-8"><title>تسجيل دخول لوحة التحكم</title></head>
            <body style="font-family: 'Cairo', sans-serif; background: #0b0f19; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="background: #1f2937; padding: 40px; border-radius: 12px; text-align: center; width: 350px; border: 1px solid #374151;">
                    <h2 style="color: #f59e0b; margin-bottom: 20px;">لوحة تحكم كتابي 🔒</h2>
                    <form action="/admin-dashboard" method="GET">
                        <input type="password" name="password" placeholder="أدخل كلمة المرور السرية" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #4b5563; background: #111827; color: white; margin-bottom: 15px; font-size: 1rem;">
                        <button type="submit" style="width: 100%; background: #f59e0b; color: #000; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem;">دخول</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }

    // لو الباسورد صح، تظهر لوحة التحكم كاملة
    let promoStatus = promoCodesDB['NasserVIP26'].used 
        ? '<span style="color: #ef4444;">مستخدم ❌ (غير صالح)</span>' 
        : '<span style="color: #10b981;">متاح للاستخدام ✅</span>';

    let html = `
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>لوحة تحكم منصة كتابي</title>
        <style>
            body { font-family: 'Cairo', sans-serif; background: #0b0f19; color: #fff; padding: 40px; }
            h1 { color: #f59e0b; margin-bottom: 20px; }
            .card-box { background: #1f2937; padding: 20px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            table { width: 100%; border-collapse: collapse; background: #1f2937; border-radius: 10px; overflow: hidden; }
            th, td { padding: 15px; text-align: right; border-bottom: 1px solid #374151; }
            th { background: #111827; color: #f59e0b; }
            .btn-approve { background: #10b981; color: white; padding: 6px 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-left: 5px; }
            .btn-approve:hover { background: #059669; }
            .btn-reject { background: #ef4444; color: white; padding: 6px 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
            .btn-reject:hover { background: #dc2626; }
            .btn-reset { background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; text-decoration: none; }
            .btn-reset:hover { background: #2563eb; }
            .status-approved { color: #10b981; font-weight: bold; }
            .status-pending { color: #f59e0b; font-weight: bold; }
            .status-rejected { color: #ef4444; font-weight: bold; }
            .promo-tag { background: #374151; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; color: #fbbf24; }
        </style>
    </head>
    <body>
        <h1>لوحة التحكم - طلبات شراء كتاب "خلف جدار العادية"</h1>
        
        <div class="card-box">
            <div>
                <span>البرومو كود (NasserVIP26): </span>
                <b>${promoStatus}</b>
            </div>
            <form action="/admin/reset-promo?password=${process.env.ADMIN_PASSWORD}" method="POST">
                <button type="submit" class="btn-reset">إعادة تفعيل الكود (Reset)</button>
            </form>
        </div>

        <table>
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>اسم العميل</th>
                    <th>البريد الإلكتروني</th>
                    <th>طريقة الدفع / الهاتف</th>
                    <th>البرومو كود المستخدم</th>
                    <th>الحالة</th>
                    <th>الإجراء (Approve / Reject)</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (orders.length === 0) {
        html += `<tr><td colspan="7" style="text-align: center;">لا توجد طلبات شراء حتى الآن.</td></tr>`;
    } else {
        orders.forEach(order => {
            let statusText = '';
            if (order.status === 'approved') statusText = '<span class="status-approved">مقبول ومُرسل ✅</span>';
            else if (order.status === 'rejected') statusText = '<span class="status-rejected">مرفوض ❌</span>';
            else statusText = '<span class="status-pending">قيد الانتظار ⏳</span>';

            html += `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.buyerName}</td>
                    <td>${order.buyerEmail}</td>
                    <td>${order.buyerPhone}</td>
                    <td><span class="promo-tag">${order.promoUsed}</span></td>
                    <td>${statusText}</td>
                    <td>
                        ${order.status === 'pending' ? `
                            <div style="display: flex; gap: 5px;">
                                <form action="/admin/approve/${order.id}?password=${process.env.ADMIN_PASSWORD}" method="POST" style="display:inline;">
                                    <button type="submit" class="btn-approve">Approve</button>
                                </form>
                                <form action="/admin/reject/${order.id}?password=${process.env.ADMIN_PASSWORD}" method="POST" style="display:inline;">
                                    <button type="submit" class="btn-reject">Reject</button>
                                </form>
                            </div>
                        ` : `تم اتخاذ إجراء 🔒`}
                    </td>
                </tr>
            `;
        });
    }

    html += `
            </tbody>
        </table>
        <br><a href="/" style="color: #f59e0b; text-decoration: none;">← العودة للموقع الرئيسي</a>
    </body>
    </html>
    `;
    res.send(html);
});

// إعادة تفعيل البرومو كود
app.post('/admin/reset-promo', (req, res) => {
    if (req.query.password !== process.env.ADMIN_PASSWORD) return res.status(403).send('غير مسموح.');
    promoCodesDB['NasserVIP26'].used = false;
    res.redirect(`/admin-dashboard?password=${process.env.ADMIN_PASSWORD}`);
});

// الموافقة
app.post('/admin/approve/:id', async (req, res) => {
    if (req.query.password !== process.env.ADMIN_PASSWORD) return res.status(403).send('غير مسموح.');
    const orderId = parseInt(req.params.id);
    const order = orders.find(o => o.id === orderId);

    if (order && order.status === 'pending') {
        order.status = 'approved';

        try {
            let testAccount = await nodemailer.createTestAccount();
            let transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });

            let downloadLink = `http://localhost:3000/download/${order.id}`;

            let info = await transporter.sendMail({
                from: '"منصة كتابي" <noreply@kotaby.com>',
                to: order.buyerEmail,
                subject: 'تهانينا! تم تأكيد طلبك - تحميل كتاب "خلف جدار العادية"',
                html: `
                    <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb; color: #111;">
                        <h2 style="color: #f59e0b;">أهلاً بك يا ${order.buyerName}</h2>
                        <p>تم تأكيد طلبك بنجاح، ويمكنك تحميل نسختك الرقمية من كتاب <b>"خلف جدار العادية"</b> للمؤلف آسر هاشم الآن مباشرة عبر الرابط التالي:</p>
                        <a href="${downloadLink}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">تحميل الكتاب الآن 📥</a>
                    </div>
                `,
            });
            console.log("✉️ تم الموافقة وإرسال الإيميل بنجاح إلى: %s", order.buyerEmail);
            console.log("🔗 رابط معاينة الإيميل: %s", nodemailer.getTestMessageUrl(info));
        } catch (error) {
            console.error("خطأ في الإرسال:", error);
        }
    }

    res.redirect(`/admin-dashboard?password=${process.env.ADMIN_PASSWORD}`);
});

// الرفض
app.post('/admin/reject/:id', (req, res) => {
    if (req.query.password !== process.env.ADMIN_PASSWORD) return res.status(403).send('غير مسموح.');
    const orderId = parseInt(req.params.id);
    const order = orders.find(o => o.id === orderId);

    if (order && order.status === 'pending') {
        order.status = 'rejected';
    }

    res.redirect(`/admin-dashboard?password=${process.env.ADMIN_PASSWORD}`);
});

// التحميل الآمن
app.get('/download/:id', (req, res) => {
    const orderId = req.params.id;
    const order = orders.find(o => o.id == orderId);

    if (order && order.status === 'approved') {
        const filePath = path.join(__dirname, 'book.pdf');
        if (fs.existsSync(filePath)) {
            res.download(filePath, 'كتاب خلف جدار العادية - آسر هاشم.pdf');
        } else {
            res.status(404).send('ملف الكتاب غير موجود.');
        }
    } else {
        res.status(403).send('رابط غير صالح.');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على: http://localhost:${PORT}`);
});