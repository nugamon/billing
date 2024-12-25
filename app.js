const mysql = require("mysql2");
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const hbs = require("hbs");

const app = express();

app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));

hbs.registerHelper('encodeURIComponent', function (value) {
  return encodeURIComponent(value);
});

hbs.registerHelper("eq", function (a, b) {
  return a === b;
});

hbs.registerHelper("or", (a, b) => a || b);

app.use(session({
  secret: "your_secret_key",
  resave: false,
  saveUninitialized: true
}));

const pool = mysql.createPool({
  host: "127.0.0.1",
  port: "3306",
  user: "root",
  password: "1234",
  database: "billing",
  charset: "UTF8_GENERAL_CI"
});

app.set("view engine", "hbs");

app.get("/", function (req, res) {
  res.render("auth");
});

app.post("/login", async (req, res) => {
  const { login, password } = req.body;

  pool.query("SELECT * FROM users WHERE login = ?", [login], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).render("auth", { error: "Ошибка сервера. Попробуйте позже." });
    }

    if (results.length === 0) {
      return res.status(401).render("auth", { error: "Неправильный логин или пароль." });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).render("auth", { error: "Неправильный логин или пароль." });
    }

    req.session.user = {
      id: user.id,
      login: user.login,
      status: user.status,
    };

    res.redirect("/main");
  });
});

app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      return res.status(500).send("Ошибка выхода.");
    }
    res.redirect("/auth");
  });
});

app.get('/main', (req, res) => {
  hbs.registerHelper("importanceClass", (importance) => {
    return importance === "ВАЖНО!" ? "important" : "reminder";
  });

  hbs.registerHelper("formatDate", (date) => {
    if (!date) {
      return 'Не указано';
    }

    if (date instanceof Date) {
      date = date.toLocaleDateString("ru-RU");
    }

    if (typeof date === 'string' && date.includes('.')) {
      const dateParts = date.split('.');
      if (dateParts.length !== 3) {
        return 'Некорректная дата';
      }
      const [day, month, year] = dateParts;
      return `${day}.${month}.${year}`;
    }

    return date;
  });

  const user = req.session.user;
  const login = user ? user.login : 'unknown';

  pool.query("SELECT COUNT(*) AS active_users FROM contracts WHERE contract_status = 'Активный'", (err, contractActiveResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Ошибка сервера. Попробуйте позже.");
    }

    pool.query("SELECT COUNT(*) AS passive_users FROM contracts WHERE contract_status != 'Активный'", (err, contractPassiveResults) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Ошибка сервера. Попробуйте позже.");
      }

      pool.query("SELECT * FROM notifications ORDER BY id DESC, date DESC LIMIT 5", (err, notificationResults) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Ошибка сервера. Попробуйте позже.");
        }

        res.render("main", {
          username: login,
          active_users: contractActiveResults[0].active_users,
          passive_users: contractPassiveResults[0].passive_users,
          notifications: notificationResults
        });
      });
    });
  });
});

const formatDate = (date) => {
  if (!date) {
    return 'Не указано';
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

app.get("/new", async (req, res) => {
  hbs.registerHelper("eq", function (a, b) {
    return a === b;
  });

  const activeSection = req.query.section || "1";
  const contractNumber = req.query.contract_number;
  const user = req.session.user;
  const login = user ? user.login : "unknown";

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  try {
    const tariffPlans = await new Promise((resolve, reject) => {
      pool.query("SELECT id, name, price FROM tariffplans", (err, results) => {
        if (err) {
          console.error(err);
          return reject("Ошибка получения тарифных планов.");
        }
        resolve(results);
      });
    });

    if (contractNumber) {
      pool.query(
        `
          SELECT c.*, t.id AS tariff_id, t.name AS tariff_name 
          FROM contracts c
          LEFT JOIN tariffplans t ON c.tariff_id = t.id
          WHERE c.contract_number = ?
        `,
        [contractNumber],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Ошибка сервера.");
          }

          if (results.length === 0) {
            return res.status(404).send("Договор не найден.");
          }

          const contract = results[0];
          const currentBalance = contract.balance || 0;

          res.render("new", {
            activeSection,
            ...contract,
            contractNumber,
            balance: currentBalance,
            tariffPlans,
            currentTariffId: contract.tariff_id,
            username: login,
          });
        }
      );
    } else {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const currentDate = `${day}.${month}.${year}`;

      pool.query(
        "SELECT COUNT(*) AS count FROM contracts WHERE contract_date = ?",
        [currentDate],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Ошибка сервера.");
          }

          const dailyCount = results[0].count + 1;
          const newContractNumber = `${month}${day}${String(dailyCount).padStart(2, "0")}/${year}`;

          res.render("new", {
            activeSection,
            contractNumber: newContractNumber,
            username: login,
            tariffPlans,
          });
        }
      );
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

app.post("/new", (req, res) => {
  const contractNumber = req.body.contract_number;
  const depositAmount = parseFloat(req.body.deposit_amount);

  if (!contractNumber || isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).send("Ошибка: Неверная сумма пополнения.");
  }

  pool.query(
    "SELECT balance FROM contracts WHERE contract_number = ?",
    [contractNumber],
    (err, results) => {
      if (err) {
        console.error("Ошибка получения баланса:", err);
        return res.status(500).send("Ошибка сервера.");
      }

      if (results.length === 0) {
        return res.status(404).send("Договор не найден.");
      }

      const currentBalance = parseFloat(results[0].balance) || 0;
      const newBalance = (currentBalance + depositAmount).toFixed(2);

      pool.query(
        "UPDATE contracts SET balance = ? WHERE contract_number = ?",
        [newBalance, contractNumber],
        (err) => {
          if (err) {
            console.error("Ошибка обновления баланса:", err);
            return res.status(500).send("Ошибка обновления данных.");
          }

          res.redirect(`/new?contract_number=${encodeURIComponent(contractNumber)}&section=2`);
        }
      );
    }
  );
});

app.post("/save", (req, res) => {
  const user = req.session.user;
  const login = user ? user.login : "unknown";
  const {
    contract_number,
    full_name,
    phone,
    connection_address,
    registration_address,
    birth_date,
    document_type,
    document_series,
    document_number,
    issued_by,
    issue_date,
    contract_status,
    contract_date,
    actual_connection_date,
  } = req.body;

  if (!contract_number) {
    return res.status(400).send("Ошибка: Номер договора обязателен.");
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const query = `
    INSERT INTO contracts 
    (contract_number, full_name, phone, connection_address, registration_address, birth_date, document_type, document_series, document_number, issued_by, issue_date, contract_status, contract_date, actual_connection_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    phone = VALUES(phone),
    connection_address = VALUES(connection_address),
    registration_address = VALUES(registration_address),
    birth_date = VALUES(birth_date),
    document_type = VALUES(document_type),
    document_series = VALUES(document_series),
    document_number = VALUES(document_number),
    issued_by = VALUES(issued_by),
    issue_date = VALUES(issue_date),
    contract_status = VALUES(contract_status),
    contract_date = VALUES(contract_date),
    actual_connection_date = VALUES(actual_connection_date)`;

  pool.query(
    query,
    [
      contract_number,
      full_name || "",
      phone || "",
      connection_address || "",
      registration_address || "",
      birth_date,
      document_type || "",
      document_series || "",
      document_number || "",
      issued_by || "",
      issue_date,
      contract_status || "Ожидает подключения",
      contract_date,
      actual_connection_date,
    ],
    (err) => {
      if (err) {
        console.error("Ошибка сохранения в базу данных:", err);
        return res.status(500).send("Ошибка сохранения данных.");
      }

      req.session.user = { login: login };

      const section = req.body.section || "1";
      res.redirect(`/new?section=${section}&contract_number=${encodeURIComponent(contract_number)}`);
    }
  );
});

app.post("/update-tariff", (req, res) => {
  const { tariff_id, contract_number } = req.body;

  if (!tariff_id || !contract_number) {
    return res.status(400).send("Некорректные данные.");
  }

  pool.query(
    "UPDATE contracts SET tariff_id = ? WHERE contract_number = ?",
    [tariff_id, contract_number],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Ошибка обновления тарифа.");
      }

      if (results.affectedRows === 0) {
        return res.status(404).send("Договор не найден.");
      }

      res.redirect(`/new?section=3&contract_number=${contract_number}`);
    }
  );
});

app.get("/open", function (req, res) {
  const user = req.session.user;
  const login = user ? user.login : "unknown";
  res.render("open", {
    username: login,
  });
});

app.post('/search', (req, res) => {
  const user = req.session.user;
  const login = user ? user.login : "unknown";
  const { contractNumber, fullName, address } = req.body;

  let query = 'SELECT * FROM contracts WHERE 1=1';
  const params = [];

  if (contractNumber) {
    query += ' AND contract_number LIKE ?';
    params.push(`%${contractNumber}%`);
  }

  if (fullName) {
    query += ' AND full_name LIKE ?';
    params.push(`%${fullName}%`);
  }

  if (address) {
    query += ' AND connection_address LIKE ?';
    params.push(`%${address}%`);
  }

  pool.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Ошибка сервера. Попробуйте позже.');
    }

    res.render("open", {
      username: login,
      contracts: results,
      section: 1
    });
  });
});

function requireManager(req, res, next) {
  const user = req.session.user;
  if (!user || (user.status !== "base_plus" && user.status !== "base_pro")) {
    return res.status(403).send("Доступ запрещен.");
  }
  next();
}

app.get("/server", (req, res) => {
  const user = req.session.user;
  const login = user ? user.login : "unknown";
  const activeSection = req.query.section || "1";
  const isManager = user && (user.status === "base_plus" || user.status === "base_pro");

  hbs.registerHelper("eq", (a, b) => a === b);

  if (activeSection === "1") {
    pool.query("SELECT id, name, limit_gb, speed, price FROM tariffplans", (err, results) => {
      if (err) {
        console.error("Ошибка запроса тарифных планов:", err);
        return res.status(500).send("Ошибка загрузки данных.");
      }

      res.render("server", {
        username: login,
        activeSection,
        tariffPlans: results,
        isManager,
      });
    });
  } else {
    res.render("server", {
      username: login,
      activeSection,
      tariffPlans: [],
      isManager,
    });
  }
});

app.post("/create-tariff", requireManager, (req, res) => {
  const { name, limit_gb, speed, price } = req.body;

  if (!name || !speed || !price) {
    return res.status(400).send("Все обязательные поля должны быть заполнены.");
  }

  const query = `
      INSERT INTO tariffplans (name, limit_gb, speed, price)
      VALUES (?, ?, ?, ?)`;

  pool.query(query, [name, limit_gb || null, speed, price], (err) => {
    if (err) {
      console.error("Ошибка при создании нового тарифа:", err);
      return res.status(500).send("Ошибка создания тарифа.");
    }
    res.redirect("/server?section=1");
  });
});

app.post("/change-tariff", (req, res) => {
  const tariffUpdates = [];

  for (let key in req.body) {

    if (key.startsWith('name_')) {
      const id = key.split('_')[1];
      const name = req.body[key];
      const speed = req.body[`speed_${id}`];
      const price = req.body[`price_${id}`];
      const limit_gb = req.body[`limit_gb_${id}`];

      if (name && speed && price) {
        tariffUpdates.push({
          id: id,
          name: name,
          speed: speed,
          price: price,
          limit_gb: limit_gb
        });
      }
    }
  }

  if (tariffUpdates.length === 0) {
    return res.status(400).send("Нет данных для обновления.");
  }

  tariffUpdates.forEach(tariff => {
    const query = `
          UPDATE tariffplans 
          SET name = ?, speed = ?, price = ?, limit_gb = ?
          WHERE id = ?`;

    pool.query(query, [tariff.name, tariff.speed, tariff.price, tariff.limit_gb, tariff.id], (err) => {
      if (err) {
        console.error("Ошибка при обновлении тарифа", err);
        return res.status(500).send("Ошибка обновления тарифа.");
      }
    });
  });

  res.redirect("/server?section=1");
});

function requireAdmin(req, res, next) {
  const user = req.session.user;

  if (!user || user.status !== 'base_pro') {
    return res.status(403).send("Доступ запрещен. Только для администраторов.");
  }

  next();
}

app.get("/user", (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.redirect("/");
  }

  const activeSection = req.query.section || "1";
  const isAdmin = user.status === "base_pro";

  hbs.registerHelper("eq", (a, b) => a === b);
  hbs.registerHelper("or", (a, b) => a || b);

  if (activeSection === "3") {
    // Получение списка пользователей
    pool.query("SELECT id, login, status FROM users", (err, results) => {
      if (err) {
        console.error("Ошибка получения списка пользователей:", err);
        return res.status(500).send("Ошибка загрузки данных пользователей.");
      }

      res.render("user", {
        username: user.login,
        status: user.status, // Передаём статус пользователя
        activeSection,
        isAdmin,
        users: isAdmin ? results : [], // Показываем пользователей только администратору
      });
    });
  } else {
    res.render("user", {
      username: user.login,
      status: user.status, // Передаём статус пользователя
      activeSection,
      isAdmin,
    });
  }
});

app.post("/delete-user", requireAdmin, (req, res) => {
  const { id } = req.body;

  const query = "DELETE FROM users WHERE id = ?";
  pool.query(query, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Ошибка удаления пользователя.");
    }
    res.redirect("/user?section=3");
  });
});

app.post("/create-notification", requireAdmin, (req, res) => {
  const { importance, content } = req.body;
  const date = new Date().toISOString().split("T")[0];

  const query = "INSERT INTO notifications (importance, content, date) VALUES (?, ?, ?)";
  pool.query(query, [importance, content, date], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Ошибка создания уведомления.");
    }
    res.redirect("/user?section=2");
  });
});

app.post("/create-user", requireAdmin, async (req, res) => {
  const { login, password, status } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = "INSERT INTO users (login, password, status) VALUES (?, ?, ?)";
    pool.query(query, [login, hashedPassword, status], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Ошибка создания пользователя.");
      }
      res.redirect("/user?section=3");
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка обработки данных.");
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(3000, function () {
  console.log("Сервер ожидает подключения на http://localhost:3000...");
});
