// ============================================
// ДАННЫЕ ВЬЕТНАМА — актуально на 2026 год
// ============================================

const VIETNAM_DATA = {
    center: [16.0471, 107.0],
    zoom: 6,
    cities: [
        {
            id: "hanoi",
            name: "Ханой",
            nameViet: "Hà Nội",
            type: "city",
            region: "north",
            coords: [21.0278, 105.8342],
            description: "Столица Вьетнама. Старый квартал, храм Литературы, озеро Хоанкьем, уличная еда.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80", "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80", "https://images.unsplash.com/photo-1596435976296-e82813589c31?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hanoi+Vietnam"
        },
        {
            id: "halong",
            name: "Халонг",
            nameViet: "Hạ Long",
            type: "city",
            region: "north",
            coords: [20.9511, 107.0848],
            description: "Город у бухты Халонг — объекта Всемирного наследия ЮНЕСКО. Круизы среди известняковых островов.",
            images: ["https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=400&q=80", "https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ha+Long+Bay+Vietnam"
        },
        {
            id: "ninhbinh",
            name: "Ниньбинь",
            nameViet: "Ninh Bình",
            type: "city",
            region: "north",
            coords: [20.2539, 105.9750],
            description: "Там Кок, Транг Ан, храм Bai Dinh. Рисовые поля и карстовые скалы.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80", "https://images.unsplash.com/photo-1598890777032-bde83547d851?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ninh+Binh+Vietnam"
        },
        {
            id: "sapa",
            name: "Сапа",
            nameViet: "Sa Pa",
            type: "city",
            region: "north",
            coords: [22.3364, 103.8436],
            description: "Горные террасы, треккинг, этнические деревни. В ноябре прохладно, в сентябре — золотые рисовые террасы.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80", "https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Sapa+Vietnam"
        },
        {
            id: "danang",
            name: "Дананг",
            nameViet: "Đà Nẵng",
            type: "city",
            region: "central",
            coords: [16.0544, 108.2022],
            description: "Современный город с пляжем My Khe, мостом Дракона, Марбельными горами. Хорош для удалённой работы.",
            images: ["https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80", "https://images.unsplash.com/photo-1533414417583-f0b6b6d8f5a4?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Da+Nang+Vietnam"
        },
        {
            id: "hoian",
            name: "Хойан",
            nameViet: "Hội An",
            type: "city",
            region: "central",
            coords: [15.8801, 108.3380],
            description: "Колониальный старый город, фонарики, шопинг, пляж An Bang. Риск наводнений в сезон дождей.",
            images: ["https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80", "https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hoi+An+Vietnam"
        },
        {
            id: "hue",
            name: "Хюэ",
            nameViet: "Huế",
            type: "city",
            region: "central",
            coords: [16.4637, 107.5909],
            description: "Императорский город, дворцы, гробницы династии Нгуен. Историческая столица.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hue+Vietnam"
        },
        {
            id: "nhatrang",
            name: "Нячанг",
            nameViet: "Nha Trang",
            type: "city",
            region: "central_coast",
            coords: [12.2388, 109.1967],
            description: "Популярный пляжный город, острова, аквапарк, дайвинг. Осень — дождливый сезон, но терпимо в сентябре.",
            images: ["https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80", "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Nha+Trang+Vietnam"
        },
        {
            id: "hcmc",
            name: "Хошимин",
            nameViet: "TP. Hồ Chí Minh",
            type: "city",
            region: "south",
            coords: [10.8231, 106.6297],
            description: "Крупнейший мегаполис Вьетнама. Дельта Меконга, рынки, музеи войны, ночная жизнь.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80", "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ho+Chi+Minh+City+Vietnam"
        },
        {
            id: "muine",
            name: "Муйне",
            nameViet: "Mũi Né",
            type: "city",
            region: "south",
            coords: [10.9340, 108.2865],
            description: "Курорт у песчаных дюн и ветров. Идеален для кайтсёрфинга круглый год, особенно осенью.",
            images: ["https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&q=80", "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Mui+Ne+Vietnam"
        },
        {
            id: "phuquoc",
            name: "Фукуок",
            nameViet: "Phú Quốc",
            type: "city",
            region: "south",
            coords: [10.2899, 103.9840],
            description: "Крупнейший остров Вьетнама. Пляжи, снорклинг, национальный парк. Ноябрь — начало высокого сезона.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80", "https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Phu+Quoc+Vietnam"
        },
        {
            id: "cantho",
            name: "Кантхо",
            nameViet: "Cần Thơ",
            type: "city",
            region: "south",
            coords: [10.0452, 105.7469],
            description: "Главный город дельты Меконга. Плавучие рынки, речные круизы, рисовые поля.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Can+Tho+Vietnam"
        },
        {
            id: "dalat",
            name: "Далат",
            nameViet: "Đà Lạt",
            type: "city",
            region: "highlands",
            coords: [11.9404, 108.4583],
            description: "Горный город Вьетнамских Альп. Прохладный климат, водопады, плантации, колониальная архитектура.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Da+Lat+Vietnam"
        },
        {
            id: "hagiang",
            name: "Хазянг",
            nameViet: "Hà Giang",
            type: "city",
            region: "north",
            coords: [22.8233, 104.9836],
            description: "Северный Вьетнам, живописные перевалы, этнические деревни, цветущая слива весной.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ha+Giang+Vietnam"
        },
        {
            id: "phongnha-town",
            name: "Фонг Ня",
            nameViet: "Phong Nha",
            type: "city",
            region: "central",
            coords: [17.5985, 106.2965],
            description: "Базовый городок у национального парка Фонгня-Кебанг. Отсюда начинаются пещерные туры.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Phong+Nha+Vietnam"
        },
        {
            id: "quynhon",
            name: "Куинён",
            nameViet: "Quy Nhơn",
            type: "city",
            region: "central_coast",
            coords: [13.7820, 109.2198],
            description: "Тихий портовый город с пустынными пляжами, рыбацкими деревнями и чамским наследием.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Quy+Nhon+Vietnam"
        },
        {
            id: "phanthiet",
            name: "Фантхьет",
            nameViet: "Phan Thiết",
            type: "city",
            region: "south",
            coords: [10.9333, 108.1000],
            description: "Город рыбаков, порт, свежие морепродукты. Рядом с Муйне.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Phan+Thiet+Vietnam"
        }
    ],

    attractions: [
        {
            id: "halong-bay",
            name: "Бухта Халонг",
            nameViet: "Vịnh Hạ Long",
            type: "attraction",
            region: "north",
            coords: [20.9101, 107.1846],
            description: "Около 1600 известняковых островов и островков. Круизы, каяки, пещеры.",
            images: ["https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=400&q=80", "https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ha+Long+Bay"
        },
        {
            id: "tamcoc",
            name: "Там Кок",
            nameViet: "Tam Cốc",
            type: "attraction",
            region: "north",
            coords: [20.2514, 105.9330],
            description: "Рисовые поля и скалы, прогулки на лодке по реке Нго Донг.",
            images: ["https://images.unsplash.com/photo-1598890777032-bde83547d851?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Tam+Coc+Vietnam"
        },
        {
            id: "sapa-terraces",
            name: "Рисовые террасы Сапы",
            nameViet: "Ruộng bậc thang Sa Pa",
            type: "attraction",
            region: "north",
            coords: [22.3350, 103.8600],
            description: "Знаменитые террасы деревень Монг Хуа и Лао Чай. Лучшее время: сентябрь–октябрь.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Sapa+rice+terraces"
        },
        {
            id: "marble-mountains",
            name: "Марбельные горы",
            nameViet: "Ngũ Hành Sơn",
            type: "attraction",
            region: "central",
            coords: [16.0039, 108.2640],
            description: "Пять мраморных и известняковых холмов у Дананга с пещерами и храмами.",
            images: ["https://images.unsplash.com/photo-1533414417583-f0b6b6d8f5a4?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Marble+Mountains+Vietnam"
        },
        {
            id: "ba-na-hills",
            name: "Ба На Хиллз",
            nameViet: "Bà Nà Hills",
            type: "attraction",
            region: "central",
            coords: [15.9977, 107.9886],
            description: "Горный курорт с Золотым мостом, поддерживаемым руками. Канатная дорога.",
            images: ["https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ba+Na+Hills+Golden+Bridge"
        },
        {
            id: "hoi-an-old-town",
            name: "Старый город Хойан",
            nameViet: "Phố cổ Hội An",
            type: "attraction",
            region: "central",
            coords: [15.8790, 108.3350],
            description: "Объект ЮНЕСКО, сохранившийся торговый порт XV–XIX веков. Фонарики, японский мост.",
            images: ["https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hoi+An+Old+Town"
        },
        {
            id: "imperial-city",
            name: "Императорский город Хюэ",
            nameViet: "Đại nội Huế",
            type: "attraction",
            region: "central",
            coords: [16.4697, 107.5777],
            description: "Цитадель династии Нгуен с дворцами, храмами и стенами.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hue+Imperial+City"
        },
        {
            id: "cu-chi",
            name: "Тоннели Ку Чи",
            nameViet: "Địa đạo Củ Chi",
            type: "attraction",
            region: "south",
            coords: [11.1517, 106.1658],
            description: "Сеть подземных тоннелей времен Вьетнамской войны. Экскурсии из Хошимина.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cu+Chi+Tunnels"
        },
        {
            id: "mekong-delta",
            name: "Дельта Меконга",
            nameViet: "Đồng bằng sông Cửu Long",
            type: "attraction",
            region: "south",
            coords: [10.0333, 105.7500],
            description: "Реки, плавучие рынки, рисовые поля, фруктовые сады. Двухдневные круизы из Хошимина.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Mekong+Delta+Vietnam"
        },
        {
            id: "phong-nha",
            name: "Пещеры Фонг Ня",
            nameViet: "Vườn quốc gia Phong Nha-Kẻ Bàng",
            type: "attraction",
            region: "central",
            coords: [17.5589, 106.2862],
            description: "Одна из крупнейших пещерных систем мира. Тур в Son Doong — самую большую пещеру.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Phong+Nha+Cave"
        },
        {
            id: "my-son",
            name: "Святилище Мишон",
            nameViet: "Thánh địa Mỹ Sơn",
            type: "attraction",
            region: "central",
            coords: [15.7730, 108.1220],
            description: "Руины храмов Чамской цивилизации X–XIII веков. Объект ЮНЕСКО.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=My+Son+Sanctuary+Vietnam"
        },
        {
            id: "temple-of-literature",
            name: "Храм Литературы",
            nameViet: "Văn Miếu – Quốc Tử Giám",
            type: "attraction",
            region: "north",
            coords: [21.0287, 105.8358],
            description: "Первый университет Вьетнама, храм Конфуция. Символ Ханоя.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Temple+of+Literature+Hanoi"
        },
        {
            id: "hoan-kiem-lake",
            name: "Озеро Хоанкьем",
            nameViet: "Hồ Hoàn Kiếm",
            type: "attraction",
            region: "north",
            coords: [21.0288, 105.8523],
            description: "Центр Старого квартала Ханоя, храм Нефритовой горы, черепахи.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hoan+Kiem+Lake+Hanoi"
        },
        {
            id: "one-pillar-pagoda",
            name: "Пагода на одной колонне",
            nameViet: "Chùa Một Cột",
            type: "attraction",
            region: "north",
            coords: [21.0368, 105.8335],
            description: "Храм на одной колонне, построен в 1049 году. Символ Ханоя.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=One+Pillar+Pagoda+Hanoi"
        },
        {
            id: "tran-quoc-pagoda",
            name: "Пагода Чанкуок",
            nameViet: "Chùa Trấn Quốc",
            type: "attraction",
            region: "north",
            coords: [21.0462, 105.8365],
            description: "Древнейшая пагода Ханоя на полуострове у озера Запад.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Tran+Quoc+Pagoda"
        },
        {
            id: "hoa-lo-prison",
            name: "Тюрьма Хоало",
            nameViet: "Nhà tù Hỏa Lò",
            type: "attraction",
            region: "north",
            coords: [21.0192, 105.8463],
            description: "Музей в бывшей тюрьме, известной как 'Ханойский Хилтон'.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hoa+Lo+Prison"
        },
        {
            id: "bat-trang",
            name: "Деревня Батчанг",
            nameViet: "Làng gốm Bát Tràng",
            type: "attraction",
            region: "north",
            coords: [21.0890, 105.9070],
            description: "Старинная деревня керамистов. Мастер-классы по гончарному делу.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Bat+Trang+Village"
        },
        {
            id: "duong-lam",
            name: "Деревня Дуонг Лам",
            nameViet: "Làng cổ Đường Lâm",
            type: "attraction",
            region: "north",
            coords: [21.0530, 105.5950],
            description: "Древнее поселение с домами 400-летней давности, храмами и кладбищами.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Duong+Lam+Village"
        },
        {
            id: "mai-chau",
            name: "Долина Май Чау",
            nameViet: "Thung lũng Mai Châu",
            type: "attraction",
            region: "north",
            coords: [20.6500, 104.9950],
            description: "Рисовые террасы, деревни белых тайцев, дома на сваях, велосипедные прогулки.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Mai+Chau+Valley"
        },
        {
            id: "pu-luong",
            name: "Заповедник Пу Лыонг",
            nameViet: "Khu bảo tồn Pù Luông",
            type: "attraction",
            region: "north",
            coords: [20.4910, 105.2290],
            description: "Удалённые горы, бамбуковые леса, водопады, гестхаусы без электросетей.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Pu+Luong+Nature+Reserve"
        },
        {
            id: "ban-gioc",
            name: "Водопад Бан Джиок",
            nameViet: "Thác Bản Giốc",
            type: "attraction",
            region: "north",
            coords: [22.8560, 106.7220],
            description: "Каскад высотой ~30 м на границе с Китаем. Один из крупнейших в Азии.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ban+Gioc+Waterfall"
        },
        {
            id: "dong-van",
            name: "Карстовое плато Донг Ван",
            nameViet: "Cao nguyên đá Đồng Văn",
            type: "attraction",
            region: "north",
            coords: [23.2780, 105.4450],
            description: "Глобальный геопарк ЮНЕСКО. Деревни хмонгов на фоне серых скал.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Dong+Van+Karst+Plateau"
        },
        {
            id: "ma-pi-leng",
            name: "Перевал Ма Пи Ленг",
            nameViet: "Đèo Mã Pí Lèng",
            type: "attraction",
            region: "north",
            coords: [23.2340, 105.4060],
            description: "Живописный серпантин над ущельем Нхо Куе. Главная достопримечательность Хазянга.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ma+Pi+Leng+Pass"
        },
        {
            id: "fansipan",
            name: "Гора Фансипан",
            nameViet: "Núi Phan Xi Păng",
            type: "attraction",
            region: "north",
            coords: [22.3030, 103.7700],
            description: "Крыша Индокитая, 3143 м. Канатная дорога из Сапы.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Fansipan+Mountain"
        },
        {
            id: "cat-ba-national-park",
            name: "Нацпарк Катба",
            nameViet: "Vườn quốc gia Cát Bà",
            type: "attraction",
            region: "north",
            coords: [20.8000, 106.9330],
            description: "Островной парк, золотоголовые лангуры, трекинги, каякинг в заливе Ланха.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cat+Ba+National+Park"
        },
        {
            id: "viet-hai-village",
            name: "Деревня Вьет Хай",
            nameViet: "Làng Việt Hải",
            type: "attraction",
            region: "north",
            coords: [20.7280, 106.9900],
            description: "Древняя деревня в долине острова Катба. Доступна лодкой или треккингом 12 км.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Viet+Hai+Village"
        },
        {
            id: "cuc-phuong",
            name: "Нацпарк Кукфыонг",
            nameViet: "Vườn quốc gia Cúc Phương",
            type: "attraction",
            region: "north",
            coords: [20.3080, 105.6360],
            description: "Старейший нацпарк Вьетнама. Центр спасения приматов, пещера доисторического человека.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cuc+Phuong+National+Park"
        },
        {
            id: "trang-an",
            name: "Транг Ан",
            nameViet: "Quần thể danh thắng Tràng An",
            type: "attraction",
            region: "north",
            coords: [20.2550, 105.9000],
            description: "Комплекс пещер, храмов и рек в Ниньбине. Объект ЮНЕСКО.",
            images: ["https://images.unsplash.com/photo-1598890777032-bde83547d851?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Trang+An+Ninh+Binh"
        },
        {
            id: "bai-dinh",
            name: "Пагода Бай Динь",
            nameViet: "Chùa Bái Đính",
            type: "attraction",
            region: "north",
            coords: [20.2760, 105.8970],
            description: "Крупнейший буддийский комплекс Вьетнама, 20 храмов, бронзовая статуя Будды.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Bai+Dinh+Pagoda"
        },
        {
            id: "hang-mua",
            name: "Пещера Ханг Муа",
            nameViet: "Hang Múa",
            type: "attraction",
            region: "north",
            coords: [20.2420, 105.9400],
            description: "500 ступеней к обзорной площадке над рекой и рисовыми полями.",
            images: ["https://images.unsplash.com/photo-1598890777032-bde83547d851?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hang+Mua+Ninh+Binh"
        },
        {
            id: "thien-mu",
            name: "Пагода Тхьен Му",
            nameViet: "Chùa Thiên Mụ",
            type: "attraction",
            region: "central",
            coords: [16.4540, 107.5450],
            description: "Знаменитая 7-ярусная пагода на берегу реки Хыонг в Хюэ.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Thien+Mu+Pagoda"
        },
        {
            id: "hai-van-pass",
            name: "Перевал Хайван",
            nameViet: "Đèo Hải Vân",
            type: "attraction",
            region: "central",
            coords: [16.2000, 108.1330],
            description: "Серпантин 'Океанские облака' между Данангом и Хюэ. Ж/д и дорога.",
            images: ["https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hai+Van+Pass"
        },
        {
            id: "linh-phuoc",
            name: "Пагода Линь Фуок",
            nameViet: "Chùa Linh Phước",
            type: "attraction",
            region: "highlands",
            coords: [11.9400, 108.4780],
            description: "Крупнейшая пагода на юге, отделана осколками фарфора и стеклянных бутылок.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Linh+Phuoc+Pagoda+Dalat"
        },
        {
            id: "datanla-waterfall",
            name: "Водопад Датанла",
            nameViet: "Thác Datanla",
            type: "attraction",
            region: "highlands",
            coords: [11.9040, 108.4240],
            description: "Водопад у Далата с бобслейной трассой. Можно спуститься к воде.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Datanla+Waterfall+Dalat"
        },
        {
            id: "pongour-waterfall",
            name: "Водопад Понгур",
            nameViet: "Thác Pongour",
            type: "attraction",
            region: "highlands",
            coords: [11.7680, 108.2170],
            description: "Самый мощный водопад окрестностей Далата, 7 каскадов.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Pongour+Waterfall"
        },
        {
            id: "cao-dai-temple",
            name: "Храм Каодай",
            nameViet: "Tòa Thánh Cao Đài",
            type: "attraction",
            region: "south",
            coords: [11.3400, 106.1000],
            description: "Главный храм синкретичной религии каодай. Яркая архитектура, ежедневные церемонии.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cao+Dai+Temple+Tay+Ninh"
        },
        {
            id: "reunification-palace",
            name: "Дворец Воссоединения",
            nameViet: "Dinh Thống Nhất",
            type: "attraction",
            region: "south",
            coords: [10.7769, 106.6953],
            description: "Место окончания войны 30 апреля 1975 года.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Reunification+Palace+Saigon"
        },
        {
            id: "war-remnants-museum",
            name: "Музей жертв войны",
            nameViet: "Bảo tàng Chứng tích Chiến tranh",
            type: "attraction",
            region: "south",
            coords: [10.7795, 106.6922],
            description: "Музей с экспонатами времён Вьетнамской войны.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=War+Remnants+Museum+Ho+Chi+Minh"
        },
        {
            id: "ben-thanh-market",
            name: "Рынок Бентхань",
            nameViet: "Chợ Bến Thành",
            type: "attraction",
            region: "south",
            coords: [10.7725, 106.6980],
            description: "Главный рынок Хошимина. Сувениры, еда, ткани, кофе.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ben+Thanh+Market"
        },
        {
            id: "cai-rang",
            name: "Плавучий рынок Кайранг",
            nameViet: "Chợ nổi Cái Răng",
            type: "attraction",
            region: "south",
            coords: [10.0060, 105.7460],
            description: "Самый крупный плавучий рынок дельты Меконга. Лучше рано утром.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cai+Rang+Floating+Market"
        },
        {
            id: "ponagar-towers",
            name: "Башни По Нагар",
            nameViet: "Tháp Bà Ponagar",
            type: "attraction",
            region: "central_coast",
            coords: [12.2650, 109.1960],
            description: "Древние чамские башни с видом на залив Нячанга.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ponagar+Towers+Nha+Trang"
        },
        {
            id: "vinpearl-cable-car",
            name: "Канатная дорога Хон Тхом",
            nameViet: "Cáp treo Hòn Thơm",
            type: "attraction",
            region: "south",
            coords: [10.1240, 103.9760],
            description: "Самая длинная морская канатная дорога в мире. Ведёт на остров Хон Тхом у Фукуока.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hon+Thom+Cable+Car+Phu+Quoc"
        },
        {
            id: "phu-quoc-national-park",
            name: "Нацпарк Фукуок",
            nameViet: "Vườn quốc gia Phú Quốc",
            type: "attraction",
            region: "south",
            coords: [10.3000, 104.0000],
            description: "Горный лес, водопады, редкие птицы и млекопитающие на севере острова.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Phu+Quoc+National+Park"
        },
        {
            id: "mui-ne-dunes",
            name: "Песчаные дюны Муйне",
            nameViet: "Đồi cát Mũi Né",
            type: "attraction",
            region: "south",
            coords: [10.9330, 108.2700],
            description: "Красные и белые дюны. Популярное место для рассвета и катания на санях.",
            images: ["https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Mui+Ne+Sand+Dunes"
        },
        {
            id: "cat-tien",
            name: "Нацпарк Каттьен",
            nameViet: "Vườn quốc gia Cát Tiên",
            type: "attraction",
            region: "south",
            coords: [11.5080, 107.3310],
            description: "Тропический лес, азиатские слоны, олени, ночное сафари, медвежий заповедник.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cat+Tien+National+Park"
        },
        {
            id: "con-dao",
            name: "Острова Кондао",
            nameViet: "Côn Đảo",
            type: "attraction",
            region: "south",
            coords: [8.7430, 106.6020],
            description: "Архипелаг с пляжами, исторической тюрьмой и гнездящимися морскими черепахами.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Con+Dao+Island"
        },
        {
            id: "thang-long-citadel",
            name: "Цитадель Тханглонг",
            nameViet: "Hoàng thành Thăng Long",
            type: "attraction",
            region: "north",
            coords: [21.0390, 105.8320],
            description: "Остатки императорского дворца X века в Ханое. Объект ЮНЕСКО.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Thang+Long+Citadel"
        },
        {
            id: "tua-chua",
            name: "Плато Туа Чуа",
            nameViet: "Cao nguyên Tủa Chùa",
            type: "attraction",
            region: "north",
            coords: [21.6500, 103.4000],
            description: "Мини-Донг Ван на северо-западе. Деревня Та Пхин, каменная крепость, пещеры.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Tua+Chua+Plateau"
        },
        {
            id: "mui-trau",
            name: "Пещера Муи Трау",
            nameViet: "Hang Mũi Trâu",
            type: "attraction",
            region: "central",
            coords: [19.0500, 105.5800],
            description: "Пещера в форме носа буйвола у подножия горы Мань Сон. Доступна пешком в отлив.",
            images: ["https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Mui+Trau+Cave+Vietnam"
        },
        {
            id: "kim-son",
            name: "Район Ким Сон",
            nameViet: "Danh thắng Kim Sơn",
            type: "attraction",
            region: "north",
            coords: [19.9000, 105.8000],
            description: "29 известняковых гор среди болот, 7 пещер, храм Линь Унг, дикие обезьяны.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Kim+Son+Thanh+Hoa"
        },
        {
            id: "vinh-hai",
            name: "Рыбацкая деревня Виньхай",
            nameViet: "Làng chài Vĩnh Hải",
            type: "attraction",
            region: "central_coast",
            coords: [12.2000, 109.1000],
            description: "Пустынный пляж, сушёные кальмары, аутентичная рыбацкая жизнь.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Vinh+Hai+Village+Vietnam"
        },
        {
            id: "ky-co",
            name: "Пляж Ки Ко",
            nameViet: "Bãi biển Kỳ Co",
            type: "attraction",
            region: "central_coast",
            coords: [13.7900, 109.2400],
            description: "Живописный пляж с бирюзовой водой у Куинёна. Мало туристов.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Ky+Co+Beach+Quy+Nhon"
        },
        {
            id: "hoian-rice-fields",
            name: "Рисовые поля Хойана",
            nameViet: "Đồng lúa Hội An",
            type: "attraction",
            region: "central",
            coords: [15.8600, 108.3200],
            description: "Зелёные и золотые рисовые поля вокруг старого города. Остров Кам Ким.",
            images: ["https://images.unsplash.com/photo-1598890777032-bde83547d851?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Hoi+An+Rice+Fields"
        },
        {
            id: "cam-thanh",
            name: "Деревня Кам Тхань",
            nameViet: "Làng rừng dừa Cẩm Thanh",
            type: "attraction",
            region: "central",
            coords: [15.9100, 108.3500],
            description: "Водно-кокосовая деревня у Хойана. Круглые лодки баскетбот.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cam+Thanh+Coconut+Village"
        },
        {
            id: "bach-ma",
            name: "Нацпарк Батьма",
            nameViet: "Vườn quốc gia Bạch Mã",
            type: "attraction",
            region: "central",
            coords: [16.2330, 107.8330],
            description: "Горы до 1450 м, 5-ступенчатый водопад, французские виллы 1930-х, лангуры Дюка.",
            images: ["https://images.unsplash.com/photo-1519033645996-1865257e1238?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Bach+Ma+National+Park"
        },
        {
            id: "cham-islands",
            name: "Острова Чам",
            nameViet: "Cù Lao Chàm",
            type: "attraction",
            region: "central",
            coords: [15.9500, 108.6800],
            description: "Архипелаг у Хойана с коралловыми рифами, снорклингом и деревней.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cham+Islands+Hoi+An"
        }
    ],

    beaches: [
        {
            id: "my-khe",
            name: "Пляж My Khe",
            nameViet: "Bãi biển Mỹ Khê",
            type: "beach",
            region: "central",
            coords: [16.0568, 108.2463],
            description: "Голубой флаг, песок, серфинг. Рядом с Данангом.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=My+Khe+Beach"
        },
        {
            id: "an-bang",
            name: "Пляж An Bang",
            nameViet: "Bãi biển An Bàng",
            type: "beach",
            region: "central",
            coords: [15.9010, 108.3600],
            description: "Расслабленный пляж у Хойана с барами и ресторанами.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=An+Bang+Beach"
        },
        {
            id: "nha-trang-beach",
            name: "Пляж Нячанга",
            nameViet: "Bãi biển Nha Trang",
            type: "beach",
            region: "central_coast",
            coords: [12.2350, 109.1920],
            description: "Городская полоса пляжа, острова вдали. Лучше в сухой сезон.",
            images: ["https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Nha+Trang+Beach"
        },
        {
            id: "mui-ne-beach",
            name: "Пляж Муйне",
            nameViet: "Bãi biển Mũi Né",
            type: "beach",
            region: "south",
            coords: [10.9360, 108.2840],
            description: "Длинный пляж с кайтсёрфингом и виндсёрфингом.",
            images: ["https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Mui+Ne+Beach"
        },
        {
            id: "long-beach",
            name: "Long Beach (Фукуок)",
            nameViet: "Bãi Trường",
            type: "beach",
            region: "south",
            coords: [10.2090, 103.9680],
            description: "Главный пляж Фукуока с закатами. Ноябрь — идеальное время.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Long+Beach+Phu+Quoc"
        },
        {
            id: "sao-beach",
            name: "Sao Beach (Фукуок)",
            nameViet: "Bãi Sao",
            type: "beach",
            region: "south",
            coords: [10.1270, 104.0300],
            description: "Белый песок, бирюзовая вода, менее туристический.",
            images: ["https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Sao+Beach+Phu+Quoc"
        },
        {
            id: "cat-co-beach",
            name: "Пляжи Кат Ко",
            nameViet: "Bãi biển Cát Cò",
            type: "beach",
            region: "north",
            coords: [20.7250, 106.9980],
            description: "Три пляжа на острове Катба с кристально чистой водой.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Cat+Co+Beach"
        },
        {
            id: "quy-nhon-beach",
            name: "Пляж Куинёна",
            nameViet: "Bãi biển Quy Nhơn",
            type: "beach",
            region: "central_coast",
            coords: [13.7800, 109.2300],
            description: "Полумесяц пляжа в центре города. Мало туристов.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"],
            gallery: "https://www.google.com/search?tbm=isch&q=Quy+Nhon+Beach"
        }
    ],

    transport: [
        {
            id: "hanoi-airport",
            name: "Аэропорт Ханоя (Noi Bai)",
            nameViet: "Sân bay Quốc tế Nội Bài",
            type: "airport",
            region: "north",
            coords: [21.2188, 105.8043],
            description: "Международный аэропорт столицы. 27 км от центра Ханоя.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"]
        },
        {
            id: "danang-airport",
            name: "Аэропорт Дананга",
            nameViet: "Sân bay Quốc tế Đà Nẵng",
            type: "airport",
            region: "central",
            coords: [16.0439, 108.1997],
            description: "Третий по величине аэропорт Вьетнама. Рядом с центром.",
            images: ["https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80"]
        },
        {
            id: "nha-trang-airport",
            name: "Аэропорт Камрань (Нячанг)",
            nameViet: "Sân bay Quốc tế Cam Ranh",
            type: "airport",
            region: "central_coast",
            coords: [11.9982, 109.2194],
            description: "Международный аэропорт, обслуживает Нячанг. 35 км от города.",
            images: ["https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80"]
        },
        {
            id: "hcmc-airport",
            name: "Аэропорт Хошимина (Tan Son Nhat)",
            nameViet: "Sân bay Quốc tế Tân Sơn Nhất",
            type: "airport",
            region: "south",
            coords: [10.8188, 106.6519],
            description: "Крупнейший аэропорт Вьетнама. 8 км от центра города.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"]
        },
        {
            id: "phu-quoc-airport",
            name: "Аэропорт Фукуок",
            nameViet: "Sân bay Quốc tế Phú Quốc",
            type: "airport",
            region: "south",
            coords: [10.2270, 103.9670],
            description: "Международный аэропорт острова. Рядом с пляжами.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"]
        },
        {
            id: "halong-port",
            name: "Порт Халонга",
            nameViet: "Cảng Hạ Long",
            type: "port",
            region: "north",
            coords: [20.9520, 107.0900],
            description: "Отправление круизов по бухте Халонг.",
            images: ["https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=400&q=80"]
        },
        {
            id: "danang-port",
            name: "Порт Дананга",
            nameViet: "Cảng Đà Nẵng",
            type: "port",
            region: "central",
            coords: [16.1180, 108.2200],
            description: "Коммерческий порт и отправление морских экскурсий.",
            images: ["https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80"]
        },
        {
            id: "hcmc-port",
            name: "Порт Хошимина",
            nameViet: "Cảng Sài Gòn",
            type: "port",
            region: "south",
            coords: [10.7240, 106.7350],
            description: "Речные круизы по дельте Меконга и морские направления.",
            images: ["https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80"]
        },
        {
            id: "phu-quoc-port",
            name: "Порт Фукуок",
            nameViet: "Cảng Phú Quốc",
            type: "port",
            region: "south",
            coords: [10.2150, 103.9550],
            description: "Морское сообщение с материком и круизы.",
            images: ["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80"]
        }
    ],

    routes: [
        {
            id: "hanoi-halong",
            name: "Ханой → Халонг",
            from: "hanoi",
            to: "halong",
            type: "road",
            color: "#facc15",
            description: "170 км, автобус/маршрутка ~2.5–3 часа"
        },
        {
            id: "halong-ninhbinh",
            name: "Халонг → Ниньбинь",
            from: "halong",
            to: "ninhbinh",
            type: "road",
            color: "#facc15",
            description: "180 км, автобус ~4 часа"
        },
        {
            id: "ninhbinh-hanoi",
            name: "Ниньбинь → Ханой",
            from: "ninhbinh",
            to: "hanoi",
            type: "road",
            color: "#facc15",
            description: "95 км, поезд/автобус ~1.5–2 часа"
        },
        {
            id: "hanoi-sapa",
            name: "Ханой → Сапа",
            from: "hanoi",
            to: "sapa",
            type: "road",
            color: "#facc15",
            description: "320 км, автобус/микроавтобус ~5–6 часов"
        },
        {
            id: "hanoi-danang",
            name: "Ханой → Дананг",
            from: "hanoi",
            to: "danang",
            type: "flight",
            color: "#6b8aff",
            description: "Внутренний перелёт ~1 час"
        },
        {
            id: "danang-hoian",
            name: "Дананг ↔ Хойан",
            from: "danang",
            to: "hoian",
            type: "road",
            color: "#facc15",
            description: "30 км, такси/автобус/мотоцикл ~40 мин"
        },
        {
            id: "hoian-hue",
            name: "Хойан → Хюэ",
            from: "hoian",
            to: "hue",
            type: "road",
            color: "#facc15",
            description: "130 км через перевал Хайван, ~3 часа"
        },
        {
            id: "hue-danang",
            name: "Хюэ → Дананг",
            from: "hue",
            to: "danang",
            type: "road",
            color: "#facc15",
            description: "100 км по живописному перевалу Хайван"
        },
        {
            id: "danang-nhatrang",
            name: "Дананг → Нячанг",
            from: "danang",
            to: "nhatrang",
            type: "flight",
            color: "#6b8aff",
            description: "Внутренний перелёт ~1 час"
        },
        {
            id: "nhatrang-hcmc",
            name: "Нячанг → Хошимин",
            from: "nhatrang",
            to: "hcmc",
            type: "flight",
            color: "#6b8aff",
            description: "Внутренний перелёт ~1.5 часа"
        },
        {
            id: "hcmc-muine",
            name: "Хошимин → Муйне",
            from: "hcmc",
            to: "muine",
            type: "road",
            color: "#facc15",
            description: "220 км, автобус ~4.5 часа"
        },
        {
            id: "hcmc-phuquoc",
            name: "Хошимин → Фукуок",
            from: "hcmc",
            to: "phuquoc",
            type: "flight",
            color: "#6b8aff",
            description: "Перелёт ~1 час или паром из Рач Гиа/Ха Тьен"
        },
        {
            id: "hcmc-cantho",
            name: "Хошимин → Кантхо",
            from: "hcmc",
            to: "cantho",
            type: "road",
            color: "#facc15",
            description: "170 км, автобус ~3.5–4 часа"
        },
        {
            id: "hcmc-dalat",
            name: "Хошимин → Далат",
            from: "hcmc",
            to: "dalat",
            type: "road",
            color: "#facc15",
            description: "300 км, автобус ~6–7 часов через горы"
        },
        {
            id: "dalat-muine",
            name: "Далат → Муйне",
            from: "dalat",
            to: "muine",
            type: "road",
            color: "#facc15",
            description: "160 км, автобус ~4 часа, красивый горный спуск"
        },
        {
            id: "danang-phongnha",
            name: "Дананг → Фонг Ня",
            from: "danang",
            to: "phongnha-town",
            type: "road",
            color: "#facc15",
            description: "260 км, автобус ~5–6 часов"
        },
        {
            id: "halong-bay-cruise",
            name: "Круиз по бухте Халонг",
            from: "halong-port",
            to: "halong-bay",
            type: "cruise",
            color: "#22d3ee",
            path: [[20.9520, 107.0900], [20.9300, 107.1100], [20.9101, 107.1846]],
            image: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=600&q=80",
            description: "1–2 дня в бухте. Лодки, каяки, пещеры, деревни на воде.",
            getyourguide: "https://www.getyourguide.com/ru-ru/ha-long-l2053/"
        },
        {
            id: "halong-catba-cruise",
            name: "Халонг → остров Катба",
            from: "halong-port",
            to: "cat-ba-national-park",
            type: "cruise",
            color: "#22d3ee",
            path: [[20.9520, 107.0900], [20.8800, 107.0200], [20.8000, 106.9330]],
            image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80",
            description: "Морской переход ~45 мин. Через залив Ланха.",
            getyourguide: "https://www.getyourguide.com/ru-ru/cat-ba-l2053/"
        },
        {
            id: "danang-hoian-river",
            name: "Речной маршрут Дананг → Хойан",
            from: "danang-port",
            to: "hoi-an-old-town",
            type: "cruise",
            color: "#22d3ee",
            path: [[16.1180, 108.2200], [16.0700, 108.2400], [15.9000, 108.3200], [15.8790, 108.3350]],
            image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80",
            description: "Рекреационная лодка по реке Тхубон. ~1 час.",
            getyourguide: "https://www.getyourguide.com/ru-ru/hoi-an-l2057/"
        },
        {
            id: "hcmc-mekong-cruise",
            name: "Хошимин → дельта Меконга",
            from: "hcmc-port",
            to: "cai-rang",
            type: "cruise",
            color: "#22d3ee",
            path: [[10.7240, 106.7350], [10.4500, 106.7000], [10.2500, 105.8000], [10.0452, 105.7469]],
            image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80",
            description: "Двухдневный речной круиз до Кантхо с плавучими рынками.",
            getyourguide: "https://www.getyourguide.com/ru-ru/ho-chi-minh-city-l2055/"
        },
        {
            id: "info-halong-hongkong",
            name: "Круиз Халонг → Гонконг",
            from: "halong-port",
            to: "halong-port",
            type: "info",
            color: "#22d3ee",
            image: "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=600&q=80",
            description: "Международные круизы из Халонга в Гонконг/Шанхай. Линия не отображается на карте — морской маршрут.",
            getyourguide: "https://www.getyourguide.com/ru-ru/hong-kong-l163/"
        },
        {
            id: "info-hcmc-phnompenh",
            name: "Речной круиз Хошимин → Пномпень",
            from: "hcmc-port",
            to: "hcmc-port",
            type: "info",
            color: "#22d3ee",
            image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=600&q=80",
            description: "Международный речной круиз по Меконгу до Камбоджи. Билеты на сезон осень 2026 — уточняйте у операторов.",
            getyourguide: "https://www.getyourguide.com/ru-ru/phnom-penh-l313/"
        },
        {
            id: "info-phuquoc-cambodia",
            name: "Морской круиз Фукуок → Камбоджа",
            from: "phu-quoc-port",
            to: "phu-quoc-port",
            type: "info",
            color: "#22d3ee",
            image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&q=80",
            description: "Высокоскоростные паромы и яхты до побережья Камбоджи. Расписание сезонное.",
            getyourguide: "https://www.getyourguide.com/ru-ru/phu-quoc-l13494/"
        }
    ]
};

// top-level const не попадает в window — дублируем явно,
// т.к. notes.js и map.js читают window.VIETNAM_DATA
if (typeof window !== 'undefined') window.VIETNAM_DATA = VIETNAM_DATA;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VIETNAM_DATA };
}
