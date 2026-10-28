import { useEffect, useState } from 'react';
import { definePlugin, IconsModule, TextField, ButtonItem, callable } from '@steambrew/client';
import { clientLanguage, resolveSettingsLocale, settingsDictFor } from './i18n';

const GetSettingsRpc = callable<[], string>('WSF_GetSettings');
const SaveSettingsRpc = callable<[{ payload: string }], string>('WSF_SaveSettings');
const ClearCacheRpc = callable<[], string>('WSF_ClearCache');

interface PublicSettings {
  hasItadKey: boolean;
}

// The backend answers with JSON strings; anything unexpected becomes null
function parse(raw: unknown): any {
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const hintColor = '#8f98a0';
const okColor = '#a4d007';
const errColor = '#ff7b5c';

const SettingsContent = () => {
  const [locale, setLocale] = useState(() => resolveSettingsLocale());
  const t = settingsDictFor(locale);
  const [settings, setSettings] = useState<PublicSettings>({ hasItadKey: false });
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const report = (text: string, ok: boolean) => setStatus({ text, ok });
  const errorText = (code?: string) => t.errors[code ?? ''] ?? (code ? `${t.errors.default}: ${code}` : t.errors.default);

  const load = async () => {
    const r = parse(await GetSettingsRpc());
    if (r?.success && r.data) setSettings(r.data);
  };

  useEffect(() => {
    void load();
    // confirm the language with the client API; it wins over the synchronous guess
    void clientLanguage().then((lang) => {
      if (lang) setLocale(resolveSettingsLocale(lang));
    });
  }, []);

  const writeKey = async (value: string) => {
    try {
      const r = parse(await SaveSettingsRpc({ payload: JSON.stringify({ itadKey: value }) }));
      if (!r?.success) return report(errorText(r?.code), false);
      setSettings(r.data);
      setKeyInput('');
      report(value === '' ? t.keyRemoved('ITAD') : t.keySaved('ITAD'), true);
    } catch {
      report(errorText('BACKEND_UNAVAILABLE'), false);
    }
  };

  // Save never deletes: an empty field is just a reminder to paste a key
  const saveKey = () => {
    const value = keyInput.trim();
    if (value === '') return report(t.pasteFirst, false);
    return writeKey(value);
  };

  const clearCache = async () => {
    const r = parse(await ClearCacheRpc());
    report(r?.success ? t.cacheCleared : errorText('default'), !!r?.success);
  };

  return (
    <div>
      <div style={{ color: hintColor, fontSize: '12px', padding: '4px 0 12px' }}>{t.help}</div>

      {status && (
        <div style={{ color: status.ok ? okColor : errColor, fontSize: '13px', padding: '4px 0 12px' }}>
          {status.text}
        </div>
      )}

      <TextField
        label={t.itadLabel}
        description={settings.hasItadKey ? t.itadSaved : t.itadEmpty}
        bIsPassword
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void saveKey();
        }}
      />
      <ButtonItem layout="below" onClick={() => void saveKey()}>
        {t.saveItad}
      </ButtonItem>
      {settings.hasItadKey && (
        <ButtonItem layout="below" onClick={() => void writeKey('')}>
          {t.removeItad}
        </ButtonItem>
      )}

      <div style={{ height: '16px' }} />

      <ButtonItem layout="below" description={t.clearCacheDesc} onClick={() => void clearCache()}>
        {t.clearCache}
      </ButtonItem>
    </div>
  );
};

export default definePlugin(() => {
  return {
    title: 'Wishlist Sale Forecast',
    icon: <IconsModule.Settings />,
    content: <SettingsContent />,
  };
});
