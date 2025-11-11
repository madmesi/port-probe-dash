# CMDB Features Report / گزارش ویژگی‌های CMDB

## English Version

### 1. Authentication & Authorization
- User registration and login
- Automatic user approval
- Role-based access control (Admin/User)
- JWT token authentication

### 2. Server Management
- Add/Edit/Delete servers
- Server listing with search
- Server details page
- Server status tracking (online/offline/warning)
- Server grouping with color tags
- Group-based filtering
- Bulk operations (delete)
- Server information management (hostname, IP, SSH, Prometheus URL)

### 3. SSL Certificate Management
- Add SSL certificates (file upload or paste)
- Auto-parse certificate details
- Certificate expiration monitoring
- Color-coded status indicators
- Status overview dashboard
- Server association
- Auto-renewal toggle
- Expiration notifications
- Prometheus metrics export
- Alertmanager integration

### 4. Network Mapping & Analysis
- Visual network map (Canvas-based)
- Server node visualization
- Group-based connections
- Network topology analysis
- File upload for analysis (tcpdump, lsof, netstat)
- Automatic server discovery
- Connection visualization (TCP/UDP)
- Interactive map (zoom, pan, drag)
- Service and port detection

### 5. Monitoring & Metrics
- Prometheus integration
- Real-time server metrics (CPU, RAM, Disk, Network)
- Metric dashboards with charts
- Current value display cards
- Human-readable formatting
- Historical data (1 hour)
- Server selection from database
- Prometheus target matching
- Connection status indicators

### 6. SSH Terminal Access
- Web-based SSH terminal
- Secure server connection
- Browser-based terminal interface

### 7. Administration
- User management (list, approve, revoke)
- Admin role assignment
- Server group management
- API key management
- User permissions management

### 8. Documentation
- WebLogic documentation
- FAQ page

### 9. Technical Infrastructure
- Docker containerization
- PostgreSQL database
- Go backend API
- React frontend (TypeScript)
- RESTful API
- Row Level Security (RLS)
- Responsive UI design

---

## نسخه فارسی

### ۱. احراز هویت و دسترسی
- ثبت نام و ورود کاربر
- تأیید خودکار کاربر
- کنترل دسترسی مبتنی بر نقش (مدیر/کاربر)
- احراز هویت با توکن JWT

### ۲. مدیریت سرور
- افزودن/ویرایش/حذف سرور
- لیست سرورها با جستجو
- صفحه جزئیات سرور
- ردیابی وضعیت سرور (آنلاین/آفلاین/هشدار)
- گروه‌بندی سرورها با برچسب رنگی
- فیلتر بر اساس گروه
- عملیات دسته‌ای (حذف)
- مدیریت اطلاعات سرور (نام میزبان، IP، SSH، URL Prometheus)

### ۳. مدیریت گواهی SSL
- افزودن گواهی SSL (آپلود فایل یا چسباندن)
- تجزیه خودکار جزئیات گواهی
- نظارت بر انقضای گواهی
- نشانگرهای وضعیت رنگی
- داشبورد نمای کلی وضعیت
- ارتباط با سرورها
- فعال/غیرفعال کردن تمدید خودکار
- اعلان‌های انقضا
- خروجی معیارهای Prometheus
- یکپارچه‌سازی Alertmanager

### ۴. نقشه‌برداری و تحلیل شبکه
- نقشه شبکه بصری (مبتنی بر Canvas)
- تجسم گره‌های سرور
- اتصالات بر اساس گروه
- تحلیل توپولوژی شبکه
- آپلود فایل برای تحلیل (tcpdump, lsof, netstat)
- کشف خودکار سرور
- تجسم اتصالات (TCP/UDP)
- نقشه تعاملی (زوم، پان، درگ)
- تشخیص سرویس و پورت

### ۵. نظارت و معیارها
- یکپارچه‌سازی Prometheus
- معیارهای سرور در زمان واقعی (CPU، RAM، Disk، Network)
- داشبوردهای معیار با نمودار
- نمایش کارت‌های مقادیر فعلی
- قالب‌بندی قابل خواندن
- داده‌های تاریخی (1 ساعت)
- انتخاب سرور از پایگاه داده
- تطبیق هدف Prometheus
- نشانگرهای وضعیت اتصال

### ۶. دسترسی ترمینال SSH
- ترمینال SSH مبتنی بر وب
- اتصال امن به سرور
- رابط ترمینال در مرورگر

### ۷. مدیریت
- مدیریت کاربر (لیست، تأیید، لغو دسترسی)
- اختصاص نقش مدیر
- مدیریت گروه سرور
- مدیریت کلید API
- مدیریت مجوزهای کاربر

### ۸. مستندات
- مستندات WebLogic
- صفحه سوالات متداول

### ۹. زیرساخت فنی
- کانتینر Docker
- پایگاه داده PostgreSQL
- API بک‌اند Go
- فرانت‌اند React (TypeScript)
- API RESTful
- امنیت سطح ردیف (RLS)
- طراحی UI واکنش‌گرا

