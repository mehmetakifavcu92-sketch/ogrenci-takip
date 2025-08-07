# 🛡️ PROJE GÜVENLİK REHBERİ

## ✅ GÜVENLİK SİSTEMİ KURULDU

Projeniz artık Git ile korunuyor. Bir şey bozulursa geri alabilirsiniz.

## 🚨 ACİL DURUMLAR

### Proje bozuldu mu?
```bash
git reset --hard HEAD
```
Bu komut projeyi son çalışan haline geri döndürür.

### Değişiklikleri kaydetmek istiyorsanız:
```bash
git add .
git commit -m "Değişiklik açıklaması"
```

## 📋 GÜNLÜK KULLANIM

### 1. Projeyi çalıştırma:
```bash
npm start
```

### 2. Değişiklik yaptıktan sonra kaydetme:
```bash
git add .
git commit -m "Ne değiştirdiğinizi yazın"
```

### 3. Proje bozulursa geri alma:
```bash
git reset --hard HEAD
```

## 🔄 YEDEKLEME

### Manuel yedekleme:
1. Proje klasörünü kopyalayın
2. Farklı bir yere kaydedin

### Otomatik yedekleme:
Git her commit'te otomatik yedek alır.

## ⚠️ DİKKAT EDİLECEKLER

1. **node_modules klasörünü silmeyin**
2. **package.json dosyasını değiştirmeyin**
3. **Firebase ayarlarını değiştirmeyin**
4. **Büyük değişikliklerden önce commit yapın**

## 🆘 SORUN ÇÖZME

### Proje çalışmıyor:
```bash
npm install
npm start
```

### Git hatası:
```bash
git status
git reset --hard HEAD
```

## 📞 YARDIM

Sorun yaşarsanız:
1. Bu dosyayı okuyun
2. Git komutlarını deneyin
3. Gerekirse projeyi geri alın

---
**Son güncelleme:** $(date)
**Proje durumu:** ✅ Güvenli
