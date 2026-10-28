import { resolveLocale } from '../webkit/locale';
import type { LocaleCode } from '../webkit/locale';

// Texts of the plugin's settings page (Millennium settings in the Steam client)
export interface SettingsDict {
  help: string;
  itadLabel: string;
  itadSaved: string;
  itadEmpty: string;
  saveItad: string;
  removeItad: string;
  clearCache: string;
  clearCacheDesc: string;
  pasteFirst: string;
  keySaved: (label: string) => string;
  keyRemoved: (label: string) => string;
  cacheCleared: string;
  errors: Record<string, string>;
}

const en: SettingsDict = {
  help: 'Free key: isthereanydeal.com → Apps → Register App → copy the “API Key” (not the OAuth Client ID). The key is stored in the plugin settings file on this computer and is not sent to web pages.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Saved ✓. Enter a new key to replace it.',
  itadEmpty: 'Not set. Required for the plugin to work.',
  saveItad: 'Save ITAD key',
  removeItad: 'Remove ITAD key',
  clearCache: 'Clear price cache',
  clearCacheDesc: 'Use this if prices look outdated',
  pasteFirst: 'Paste a key into the field above, then click “Save”.',
  keySaved: (l) => `${l} key saved.`,
  keyRemoved: (l) => `${l} key removed.`,
  cacheCleared: 'Price cache cleared.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal rejected the key. Make sure you pasted the API Key, not the OAuth Client ID.',
    RATE_LIMITED: 'IsThereAnyDeal rate limit reached. Try again in a few minutes.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal is not responding. Try again later.',
    NO_KEY: 'No key set.',
    WRITE_FAILED: 'Could not write the plugin settings file.',
    BACKEND_UNAVAILABLE: 'Plugin backend is unavailable. Restart Steam.',
    default: 'Error',
  },
};

const ru: SettingsDict = {
  help: 'Бесплатный ключ: isthereanydeal.com → Apps → Register App → скопируйте «API Key» (не OAuth Client ID). Ключ хранится в файле настроек плагина на этом компьютере и не передаётся веб-страницам.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Сохранён ✓. Введите новый ключ, чтобы заменить.',
  itadEmpty: 'Не задан. Обязательно для работы плагина.',
  saveItad: 'Сохранить ключ ITAD',
  removeItad: 'Удалить ключ ITAD',
  clearCache: 'Очистить кэш цен',
  clearCacheDesc: 'Нужно, если цены выглядят устаревшими',
  pasteFirst: 'Вставьте ключ в поле выше, затем нажмите «Сохранить».',
  keySaved: (l) => `Ключ ${l} сохранён.`,
  keyRemoved: (l) => `Ключ ${l} удалён.`,
  cacheCleared: 'Кэш цен очищен.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal отклонил ключ. Проверьте, что вставили API Key, а не OAuth Client ID.',
    RATE_LIMITED: 'Лимит запросов IsThereAnyDeal исчерпан. Попробуйте через несколько минут.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal не отвечает. Попробуйте позже.',
    NO_KEY: 'Ключ не задан.',
    WRITE_FAILED: 'Не удалось записать файл настроек плагина.',
    BACKEND_UNAVAILABLE: 'Бэкенд плагина недоступен. Перезапустите Steam.',
    default: 'Ошибка',
  },
};

const uk: SettingsDict = {
  help: 'Безкоштовний ключ: isthereanydeal.com → Apps → Register App → скопіюйте «API Key» (не OAuth Client ID). Ключ зберігається у файлі налаштувань плагіна на цьому комп’ютері і не передається веб-сторінкам.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Збережено ✓. Введіть новий ключ, щоб замінити.',
  itadEmpty: 'Не задано. Обов’язково для роботи плагіна.',
  saveItad: 'Зберегти ключ ITAD',
  removeItad: 'Видалити ключ ITAD',
  clearCache: 'Очистити кеш цін',
  clearCacheDesc: 'Потрібно, якщо ціни виглядають застарілими',
  pasteFirst: 'Вставте ключ у поле вище, потім натисніть «Зберегти».',
  keySaved: (l) => `Ключ ${l} збережено.`,
  keyRemoved: (l) => `Ключ ${l} видалено.`,
  cacheCleared: 'Кеш цін очищено.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal відхилив ключ. Переконайтеся, що вставили API Key, а не OAuth Client ID.',
    RATE_LIMITED: 'Ліміт запитів IsThereAnyDeal вичерпано. Спробуйте за кілька хвилин.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal не відповідає. Спробуйте пізніше.',
    NO_KEY: 'Ключ не задано.',
    WRITE_FAILED: 'Не вдалося записати файл налаштувань плагіна.',
    BACKEND_UNAVAILABLE: 'Бекенд плагіна недоступний. Перезапустіть Steam.',
    default: 'Помилка',
  },
};

const de: SettingsDict = {
  help: 'Kostenloser Schlüssel: isthereanydeal.com → Apps → Register App → den „API Key“ kopieren (nicht die OAuth Client ID). Der Schlüssel wird in der Einstellungsdatei des Plugins auf diesem Computer gespeichert und nicht an Webseiten gesendet.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Gespeichert ✓. Neuen Schlüssel eingeben, um ihn zu ersetzen.',
  itadEmpty: 'Nicht gesetzt. Für das Plugin erforderlich.',
  saveItad: 'ITAD-Schlüssel speichern',
  removeItad: 'ITAD-Schlüssel entfernen',
  clearCache: 'Preis-Cache leeren',
  clearCacheDesc: 'Nutzen, wenn Preise veraltet wirken',
  pasteFirst: 'Füge oben einen Schlüssel ein und klicke dann auf „Speichern“.',
  keySaved: (l) => `${l}-Schlüssel gespeichert.`,
  keyRemoved: (l) => `${l}-Schlüssel entfernt.`,
  cacheCleared: 'Preis-Cache geleert.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal hat den Schlüssel abgelehnt. Prüfe, ob du den API Key und nicht die OAuth Client ID eingefügt hast.',
    RATE_LIMITED: 'Limit der IsThereAnyDeal-Anfragen erreicht. Versuche es in ein paar Minuten erneut.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal antwortet nicht. Versuche es später erneut.',
    NO_KEY: 'Kein Schlüssel gesetzt.',
    WRITE_FAILED: 'Die Einstellungsdatei des Plugins konnte nicht geschrieben werden.',
    BACKEND_UNAVAILABLE: 'Das Backend des Plugins ist nicht erreichbar. Starte Steam neu.',
    default: 'Fehler',
  },
};

const fr: SettingsDict = {
  help: 'Clé gratuite : isthereanydeal.com → Apps → Register App → copiez la « API Key » (pas l’OAuth Client ID). La clé est enregistrée dans le fichier de réglages du plugin sur cet ordinateur et n’est pas envoyée aux pages web.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Enregistrée ✓. Saisissez une nouvelle clé pour la remplacer.',
  itadEmpty: 'Non définie. Obligatoire pour le fonctionnement du plugin.',
  saveItad: 'Enregistrer la clé ITAD',
  removeItad: 'Supprimer la clé ITAD',
  clearCache: 'Vider le cache des prix',
  clearCacheDesc: 'À utiliser si les prix semblent périmés',
  pasteFirst: 'Collez une clé dans le champ ci-dessus, puis cliquez sur « Enregistrer ».',
  keySaved: (l) => `Clé ${l} enregistrée.`,
  keyRemoved: (l) => `Clé ${l} supprimée.`,
  cacheCleared: 'Cache des prix vidé.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal a refusé la clé. Vérifiez que vous avez collé l’API Key et non l’OAuth Client ID.',
    RATE_LIMITED: 'Limite de requêtes IsThereAnyDeal atteinte. Réessayez dans quelques minutes.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal ne répond pas. Réessayez plus tard.',
    NO_KEY: 'Aucune clé définie.',
    WRITE_FAILED: 'Impossible d’écrire le fichier de réglages du plugin.',
    BACKEND_UNAVAILABLE: 'Le backend du plugin est indisponible. Redémarrez Steam.',
    default: 'Erreur',
  },
};

const es: SettingsDict = {
  help: 'Clave gratuita: isthereanydeal.com → Apps → Register App → copia la «API Key» (no el OAuth Client ID). La clave se guarda en el archivo de ajustes del plugin en este equipo y no se envía a páginas web.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Guardada ✓. Introduce una nueva clave para reemplazarla.',
  itadEmpty: 'No establecida. Necesaria para que el plugin funcione.',
  saveItad: 'Guardar clave ITAD',
  removeItad: 'Eliminar clave ITAD',
  clearCache: 'Borrar caché de precios',
  clearCacheDesc: 'Úsalo si los precios parecen desactualizados',
  pasteFirst: 'Pega una clave en el campo de arriba y luego haz clic en «Guardar».',
  keySaved: (l) => `Clave ${l} guardada.`,
  keyRemoved: (l) => `Clave ${l} eliminada.`,
  cacheCleared: 'Caché de precios borrada.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal rechazó la clave. Comprueba que pegaste la API Key y no el OAuth Client ID.',
    RATE_LIMITED: 'Se alcanzó el límite de peticiones de IsThereAnyDeal. Inténtalo en unos minutos.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal no responde. Inténtalo más tarde.',
    NO_KEY: 'No hay clave establecida.',
    WRITE_FAILED: 'No se pudo escribir el archivo de ajustes del plugin.',
    BACKEND_UNAVAILABLE: 'El backend del plugin no está disponible. Reinicia Steam.',
    default: 'Error',
  },
};

const pt: SettingsDict = {
  help: 'Chave gratuita: isthereanydeal.com → Apps → Register App → copie a «API Key» (não o OAuth Client ID). A chave fica salva no arquivo de configurações do plugin neste computador e não é enviada a páginas da web.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Salva ✓. Digite uma nova chave para substituí-la.',
  itadEmpty: 'Não definida. Obrigatória para o plugin funcionar.',
  saveItad: 'Salvar chave ITAD',
  removeItad: 'Remover chave ITAD',
  clearCache: 'Limpar cache de preços',
  clearCacheDesc: 'Use se os preços parecerem desatualizados',
  pasteFirst: 'Cole uma chave no campo acima e clique em «Salvar».',
  keySaved: (l) => `Chave ${l} salva.`,
  keyRemoved: (l) => `Chave ${l} removida.`,
  cacheCleared: 'Cache de preços limpo.',
  errors: {
    BAD_KEY: 'O IsThereAnyDeal recusou a chave. Confira se colou a API Key, não o OAuth Client ID.',
    RATE_LIMITED: 'Limite de requisições do IsThereAnyDeal atingido. Tente em alguns minutos.',
    ITAD_UNAVAILABLE: 'O IsThereAnyDeal não está respondendo. Tente mais tarde.',
    NO_KEY: 'Nenhuma chave definida.',
    WRITE_FAILED: 'Não foi possível gravar o arquivo de configurações do plugin.',
    BACKEND_UNAVAILABLE: 'O backend do plugin está indisponível. Reinicie a Steam.',
    default: 'Erro',
  },
};

const pl: SettingsDict = {
  help: 'Darmowy klucz: isthereanydeal.com → Apps → Register App → skopiuj „API Key” (nie OAuth Client ID). Klucz jest zapisany w pliku ustawień pluginu na tym komputerze i nie jest wysyłany do stron internetowych.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Zapisany ✓. Wpisz nowy klucz, aby go zastąpić.',
  itadEmpty: 'Nie ustawiono. Wymagany do działania pluginu.',
  saveItad: 'Zapisz klucz ITAD',
  removeItad: 'Usuń klucz ITAD',
  clearCache: 'Wyczyść pamięć cen',
  clearCacheDesc: 'Użyj, jeśli ceny wyglądają na nieaktualne',
  pasteFirst: 'Wklej klucz w pole powyżej, a następnie kliknij „Zapisz”.',
  keySaved: (l) => `Klucz ${l} zapisany.`,
  keyRemoved: (l) => `Klucz ${l} usunięty.`,
  cacheCleared: 'Pamięć cen wyczyszczona.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal odrzucił klucz. Sprawdź, czy wklejono API Key, a nie OAuth Client ID.',
    RATE_LIMITED: 'Przekroczono limit zapytań IsThereAnyDeal. Spróbuj za kilka minut.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal nie odpowiada. Spróbuj później.',
    NO_KEY: 'Nie ustawiono klucza.',
    WRITE_FAILED: 'Nie udało się zapisać pliku ustawień pluginu.',
    BACKEND_UNAVAILABLE: 'Backend pluginu jest niedostępny. Uruchom ponownie Steam.',
    default: 'Błąd',
  },
};

const tr: SettingsDict = {
  help: 'Ücretsiz anahtar: isthereanydeal.com → Apps → Register App → “API Key” değerini kopyalayın (OAuth Client ID değil). Anahtar bu bilgisayardaki eklenti ayar dosyasında saklanır ve web sayfalarına gönderilmez.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Kaydedildi ✓. Değiştirmek için yeni bir anahtar girin.',
  itadEmpty: 'Ayarlanmadı. Eklentinin çalışması için gerekli.',
  saveItad: 'ITAD anahtarını kaydet',
  removeItad: 'ITAD anahtarını kaldır',
  clearCache: 'Fiyat önbelleğini temizle',
  clearCacheDesc: 'Fiyatlar eskiyse kullanın',
  pasteFirst: 'Yukarıdaki alana bir anahtar yapıştırın, ardından “Kaydet”e tıklayın.',
  keySaved: (l) => `${l} anahtarı kaydedildi.`,
  keyRemoved: (l) => `${l} anahtarı kaldırıldı.`,
  cacheCleared: 'Fiyat önbelleği temizlendi.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal anahtarı reddetti. API Key’i yapıştırdığınızdan emin olun, OAuth Client ID’yi değil.',
    RATE_LIMITED: 'IsThereAnyDeal istek sınırına ulaşıldı. Birkaç dakika sonra tekrar deneyin.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal yanıt vermiyor. Daha sonra tekrar deneyin.',
    NO_KEY: 'Anahtar ayarlanmadı.',
    WRITE_FAILED: 'Eklentinin ayar dosyası yazılamadı.',
    BACKEND_UNAVAILABLE: 'Eklentinin arka ucu kullanılamıyor. Steam’i yeniden başlatın.',
    default: 'Hata',
  },
};

const it: SettingsDict = {
  help: 'Chiave gratuita: isthereanydeal.com → Apps → Register App → copia la «API Key» (non l’OAuth Client ID). La chiave è salvata nel file delle impostazioni del plugin su questo computer e non viene inviata alle pagine web.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: 'Salvata ✓. Inserisci una nuova chiave per sostituirla.',
  itadEmpty: 'Non impostata. Necessaria per il funzionamento del plugin.',
  saveItad: 'Salva chiave ITAD',
  removeItad: 'Rimuovi chiave ITAD',
  clearCache: 'Svuota cache prezzi',
  clearCacheDesc: 'Usalo se i prezzi sembrano non aggiornati',
  pasteFirst: 'Incolla una chiave nel campo sopra, poi clicca «Salva».',
  keySaved: (l) => `Chiave ${l} salvata.`,
  keyRemoved: (l) => `Chiave ${l} rimossa.`,
  cacheCleared: 'Cache prezzi svuotata.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal ha rifiutato la chiave. Controlla di aver incollato la API Key e non l’OAuth Client ID.',
    RATE_LIMITED: 'Raggiunto il limite di richieste di IsThereAnyDeal. Riprova tra qualche minuto.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal non risponde. Riprova più tardi.',
    NO_KEY: 'Nessuna chiave impostata.',
    WRITE_FAILED: 'Impossibile scrivere il file delle impostazioni del plugin.',
    BACKEND_UNAVAILABLE: 'Il backend del plugin non è disponibile. Riavvia Steam.',
    default: 'Errore',
  },
};

const ja: SettingsDict = {
  help: '無料キー: isthereanydeal.com → Apps → Register App → 「API Key」をコピー（OAuth Client ID ではありません）。キーはこのコンピューター上のプラグイン設定ファイルに保存され、Web ページには送信されません。',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: '保存済み ✓。入れ替える場合は新しいキーを入力してください。',
  itadEmpty: '未設定。プラグインの動作に必要です。',
  saveItad: 'ITAD キーを保存',
  removeItad: 'ITAD キーを削除',
  clearCache: '価格キャッシュを消去',
  clearCacheDesc: '価格が古いと感じる場合に使用してください',
  pasteFirst: '上の入力欄にキーを貼り付けて「保存」をクリックしてください。',
  keySaved: (l) => `${l} キーを保存しました。`,
  keyRemoved: (l) => `${l} キーを削除しました。`,
  cacheCleared: '価格キャッシュを消去しました。',
  errors: {
    BAD_KEY: 'IsThereAnyDeal がキーを拒否しました。OAuth Client ID ではなく API Key を貼り付けたか確認してください。',
    RATE_LIMITED: 'IsThereAnyDeal のリクエスト上限に達しました。数分後に再試行してください。',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal が応答しません。しばらくしてから再試行してください。',
    NO_KEY: 'キーが設定されていません。',
    WRITE_FAILED: 'プラグイン設定ファイルに書き込めませんでした。',
    BACKEND_UNAVAILABLE: 'プラグインのバックエンドが利用できません。Steam を再起動してください。',
    default: 'エラー',
  },
};

const ko: SettingsDict = {
  help: '무료 키: isthereanydeal.com → Apps → Register App → “API Key”를 복사하세요(OAuth Client ID 아님). 키는 이 컴퓨터의 플러그인 설정 파일에 저장되며 웹 페이지로 전송되지 않습니다.',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: '저장됨 ✓. 새 키를 입력하면 교체됩니다.',
  itadEmpty: '설정되지 않음. 플러그인 작동에 필요합니다.',
  saveItad: 'ITAD 키 저장',
  removeItad: 'ITAD 키 삭제',
  clearCache: '가격 캐시 지우기',
  clearCacheDesc: '가격이 오래된 것 같을 때 사용하세요',
  pasteFirst: '위 입력란에 키를 붙여넣고 “저장”을 클릭하세요.',
  keySaved: (l) => `${l} 키가 저장되었습니다.`,
  keyRemoved: (l) => `${l} 키가 삭제되었습니다.`,
  cacheCleared: '가격 캐시를 지웠습니다.',
  errors: {
    BAD_KEY: 'IsThereAnyDeal이 키를 거부했습니다. OAuth Client ID가 아닌 API Key를 붙여넣었는지 확인하세요.',
    RATE_LIMITED: 'IsThereAnyDeal 요청 한도에 도달했습니다. 몇 분 후 다시 시도하세요.',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal이 응답하지 않습니다. 나중에 다시 시도하세요.',
    NO_KEY: '키가 설정되지 않았습니다.',
    WRITE_FAILED: '플러그인 설정 파일을 쓸 수 없습니다.',
    BACKEND_UNAVAILABLE: '플러그인 백엔드를 사용할 수 없습니다. Steam을 다시 시작하세요.',
    default: '오류',
  },
};

const zh: SettingsDict = {
  help: '免费密钥：isthereanydeal.com → Apps → Register App → 复制“API Key”（不是 OAuth Client ID）。密钥保存在本机的插件设置文件中，不会发送给网页。',
  itadLabel: 'IsThereAnyDeal API Key',
  itadSaved: '已保存 ✓。输入新密钥即可替换。',
  itadEmpty: '未设置。插件运行必需。',
  saveItad: '保存 ITAD 密钥',
  removeItad: '删除 ITAD 密钥',
  clearCache: '清除价格缓存',
  clearCacheDesc: '价格看起来过时时使用',
  pasteFirst: '请在上方输入框中粘贴密钥，然后点击“保存”。',
  keySaved: (l) => `${l} 密钥已保存。`,
  keyRemoved: (l) => `${l} 密钥已删除。`,
  cacheCleared: '价格缓存已清除。',
  errors: {
    BAD_KEY: 'IsThereAnyDeal 拒绝了该密钥。请确认粘贴的是 API Key，而不是 OAuth Client ID。',
    RATE_LIMITED: '已达到 IsThereAnyDeal 请求上限，请几分钟后再试。',
    ITAD_UNAVAILABLE: 'IsThereAnyDeal 没有响应，请稍后再试。',
    NO_KEY: '未设置密钥。',
    WRITE_FAILED: '无法写入插件设置文件。',
    BACKEND_UNAVAILABLE: '插件后端不可用，请重启 Steam。',
    default: '错误',
  },
};

const DICTS: Record<LocaleCode, SettingsDict> = { en, ru, uk, de, fr, es, pt, pl, tr, it, ja, ko, zh };

// The settings page lives inside the Steam client, so the client's own interface
// language comes first: LocalizationManager is filled synchronously ("russian", "english"...),
// then the cookie / page / browser language as fallbacks.
function syncHints(): string[] {
  const hints: string[] = [];
  try {
    const locales = (window as any).LocalizationManager?.m_rgLocalesToUse;
    if (Array.isArray(locales) && typeof locales[0] === 'string') hints.push(locales[0]);
  } catch {
    /* not in the client */
  }
  try {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith('Steam_Language='));
    if (cookie) hints.push(decodeURIComponent(cookie.slice('Steam_Language='.length)));
  } catch {
    /* no cookie access */
  }
  hints.push(document.documentElement.lang, navigator.language);
  return hints;
}

export function resolveSettingsLocale(preferred?: string | null): LocaleCode {
  for (const h of [preferred, ...syncHints()]) {
    const code = resolveLocale(h);
    if (code) return code;
  }
  return 'en';
}

export function settingsDictFor(code: LocaleCode): SettingsDict {
  return DICTS[code];
}

// Authoritative client language from the Steam API (async); null if unavailable
export async function clientLanguage(): Promise<string | null> {
  try {
    const fn = (window as any).SteamClient?.Settings?.GetCurrentLanguage;
    if (typeof fn !== 'function') return null;
    const v = await fn.call((window as any).SteamClient.Settings);
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}
