import React, { useState } from "react";
import {
  Database,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Server,
  Key,
  ShieldCheck,
  FileCode,
  Layers,
  ArrowRight,
  HardDrive,
  RefreshCw,
  Zap,
  ShoppingBag,
  ExternalLink,
  Info,
} from "lucide-react";
import { generateSqlSchemaScript } from "../utils/sqlService";

interface DatabaseInstructionsTabProps {
  onNavigateToSqlConsole?: () => void;
  onNavigateToShopGold?: () => void;
}

export const DatabaseInstructionsTab: React.FC<DatabaseInstructionsTabProps> = ({
  onNavigateToSqlConsole,
  onNavigateToShopGold,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sampleEnvConfig = `# ==========================================================
# KONFIGURACJA POŁĄCZENIA BAZY DANYCH (DirectAdmin / MySQL / PostgreSQL)
# Serwer: ukonesera.pl (Mysłakowice)
# ==========================================================
DB_ENGINE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ukoneser_wms2026
DB_USER=ukoneser_admin
DB_PASSWORD=TwojeBezpieczneHasloSQL!2026
DB_SSL=false
DB_POOL_SIZE=10

# POŁĄCZENIE Z BAZĄ SKLEPU SHOPGOLD (DirectAdmin MySQL)
SHOPGOLD_DB_NAME=ukoneser_shopgold
SHOPGOLD_DB_USER=ukoneser_sguser
SHOPGOLD_DB_PASSWORD=HasloShopGoldMySQL!2026
SHOPGOLD_API_URL=https://sklep.ukonesera.pl/api/v1
SHOPGOLD_API_KEY=sg_konesera_live_myslakowice_2026`;

  const nodeJsConnectionExample = `// ==========================================================
// PRZYKŁAD POŁĄCZENIA W TYPESCRIPT / NODE.JS (mysql2 / drizzle)
// ==========================================================
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'ukoneser_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ukoneser_wms2026',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Test połączenia z bazą
export async function testDatabaseConnection() {
  const connection = await pool.getConnection();
  const [rows] = await connection.query('SELECT 1 + 1 AS result');
  connection.release();
  return rows;
}`;

  const backupCronScript = `#!/bin/bash
# ==========================================================
# AUTOMATYCZNY CODZIENNY BACKUP BAZY WMS I SHOPGOLD
# Umieść w cron serwera Linux (DirectAdmin / Mysłakowice): crontab -e
# 0 3 * * * /home/ukoneser/scripts/backup_wms_daily.sh
# ==========================================================
BACKUP_DIR="/home/ukoneser/backups/sql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_USER="ukoneser_admin"
DB_PASS="TwojeBezpieczneHasloSQL!2026"
DB_NAME="ukoneser_wms2026"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASS --single-transaction --quick --routines $DB_NAME | gzip > "$BACKUP_DIR/wms_backup_$DATE.sql.gz"

# Usuwaj kopie starsze niż 30 dni
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -exec rm {} \\;
echo "Kopia zapasowa bazy danych wykonana pomyślnie: wms_backup_$DATE.sql.gz"`;

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-5 shadow-xs">
      {/* HEADER INSTRUKCJI */}
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-yellow-400 rounded-lg text-slate-950">
            <Database className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
              Instrukcja Połączenia z Bazą Danych & Zapis Pełnych Danych
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Kompletny przewodnik konfiguracji MySQL, MariaDB, PostgreSQL, chmury Firestore oraz ShopGold
            </p>
          </div>
        </div>

        {onNavigateToSqlConsole && (
          <button
            onClick={onNavigateToSqlConsole}
            className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <span>Przejdź do Studia SQL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3-WARSTWOWA ARCHITEKTURA BEZPIECZEŃSTWA DANYCH */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
        <h3 className="font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Gwarancja 100% Trwałości Danych (Architektura Zero-Loss)
        </h3>
        <p className="text-slate-300 leading-relaxed">
          System magazynowy <strong>PHU U KONESERA</strong> stosuje trójstopniową redundancję zapisu danych,
          co gwarantuje, że żadna wprowadzona część, zdjęcie, numer OEM ani status zamówienia ze sklepu <strong>ShopGold</strong> nie zostaną utracone.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase block">1. Baza Relacyjna SQL</span>
            <p className="text-white font-bold text-xs">MySQL / DirectAdmin / PostgreSQL</p>
            <p className="text-[11px] text-slate-400">
              Trwałe tabele relacyjne, kody OEM, indeksy wyszukiwania, relacje demontażu aut i most do sklepu ShopGold.
            </p>
          </div>

          <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-yellow-400 font-bold uppercase block">2. Chmura Firestore</span>
            <p className="text-white font-bold text-xs">Google Cloud Firestore</p>
            <p className="text-[11px] text-slate-400">
              Automatyczna synchronizacja między stanowiskami pracowników na placu w Mysłakowicach a biurem handlowym.
            </p>
          </div>

          <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-cyan-400 font-bold uppercase block">3. Bufor Offline</span>
            <p className="text-white font-bold text-xs">IndexedDB + LocalStorage</p>
            <p className="text-[11px] text-slate-400">
              Zapis natychmiastowy w przeglądarce i telefonie. Pracownik może skanować części nawet przy braku internetu.
            </p>
          </div>
        </div>
      </div>

      {/* KROK 1: PARAMETRY POŁĄCZENIA I PLIK .ENV */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-[10px]">1</span>
            Konfiguracja Zmiennych Środowiskowych (.env)
          </h3>
          <button
            onClick={() => copyCode(sampleEnvConfig, "env_config")}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition text-[11px]"
          >
            {copiedSection === "env_config" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-yellow-400" />}
            <span>{copiedSection === "env_config" ? "Skopiowano!" : "Kopiuj .env"}</span>
          </button>
        </div>

        <p className="text-slate-400">
          W katalogu głównym projektu lub na serwerze DirectAdmin utwórz plik <code>.env</code> z danymi dostępowymi do bazy MySQL stacji demontażu:
        </p>

        <div className="bg-[#070b14] p-3 rounded-lg border border-slate-850 text-[11px] text-amber-200/90 overflow-x-auto whitespace-pre">
          {sampleEnvConfig}
        </div>
      </div>

      {/* KROK 2: UDOSTĘPNIENIE REMOTE MYSQL W DIRECTADMIN */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
        <h3 className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-[10px]">2</span>
          Włączenie Zdalnego Dostępu (Remote MySQL) w DirectAdmin / cPanel
        </h3>

        <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
          <p>
            Aby aplikacja mogła łączyć się bezpośrednio z bazą danych MySQL sklepu <strong>ShopGold</strong> lub WMS na serwerze:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-2">
            <li>Zaloguj się do panelu <strong>DirectAdmin</strong> lub <strong>cPanel</strong> na serwerze <em>ukonesera.pl</em>.</li>
            <li>Przejdź do sekcji <strong>Zarządzanie MySQL (MySQL Management)</strong> ➔ <strong>Zdalne bazy danych (Remote MySQL)</strong>.</li>
            <li>W polu <em>Host dostępu</em> wpisz znak <code>%</code> (zezwolenie na połączenie z dowolnego autoryzowanego adresu) lub podaj IP Twojego serwera.</li>
            <li>Upewnij się, że port <strong>3306</strong> jest otwarty w zaporze sieciowej (Firewall CSF/iptables).</li>
          </ol>
        </div>
      </div>

      {/* KROK 3: WYKONANIE STRUKTURY TABEL DDL */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-[10px]">3</span>
            Struktura Relacyjna Bazy (5 Tabel WMS + ShopGold)
          </h3>
          <button
            onClick={() => copyCode(generateSqlSchemaScript("mysql"), "schema_script")}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition text-[11px]"
          >
            {copiedSection === "schema_script" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-yellow-400" />}
            <span>{copiedSection === "schema_script" ? "Skopiowano SQL!" : "Kopiuj Pełny DDL"}</span>
          </button>
        </div>

        <p className="text-slate-400">
          Uruchom poniższy schemat w <strong>phpMyAdmin</strong> lub w konsoli MySQL serwera, aby utworzyć kompletne tabele:
        </p>

        <div className="bg-[#070b14] p-3 rounded-lg border border-slate-850 text-[11px] text-teal-200/90 max-h-48 overflow-y-auto whitespace-pre">
          {generateSqlSchemaScript("mysql").substring(0, 1200)}...
        </div>
      </div>

      {/* KROK 4: AUTOMATYCZNY CRON BACKUP */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-[10px]">4</span>
            Automatyczny Codzienny Backup Danych (Cron mysqldump)
          </h3>
          <button
            onClick={() => copyCode(backupCronScript, "cron_script")}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition text-[11px]"
          >
            {copiedSection === "cron_script" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-yellow-400" />}
            <span>{copiedSection === "cron_script" ? "Skopiowano Cron!" : "Kopiuj Skrypt Cron"}</span>
          </button>
        </div>

        <p className="text-slate-400">
          Aby zapewnić automatyczne, codzienne kopie zapasowe bazy o godzinie 03:00 w nocy, zapisz poniższy skrypt na serwerze Linux:
        </p>

        <div className="bg-[#070b14] p-3 rounded-lg border border-slate-850 text-[11px] text-emerald-200/90 overflow-x-auto whitespace-pre">
          {backupCronScript}
        </div>
      </div>
    </div>
  );
};
