#!/usr/bin/env python3
"""
App Store Connect API client — CronoPet IAP automation.

Uso:
  python scripts/asc_api.py <comando> [args]

Comandos:
  list-apps                 Lista apps na conta (sanity check de credentials)
  list-subscription-groups  Lista subscription groups do CronoPet
  create-products           Cria CronoPet Premium Monthly + Annual + Group
  validate-products         Confere se produtos estão configurados corretamente

Env vars necessárias:
  ASC_KEY_ID                Key ID da App Store Connect API key
  ASC_ISSUER_ID             Issuer ID (uuid)
  ASC_P8_PATH               (opcional) path do .p8. Default:
                            ~/cronopet-credentials/AuthKey_{KEY_ID}.p8

Documentação Apple:
  https://developer.apple.com/documentation/appstoreconnectapi
"""

import os
import sys
import time
import json
from pathlib import Path
from typing import Optional, Dict, List, Any

import jwt          # pip install pyjwt[crypto]
import requests     # pip install requests


# ─── Config ───────────────────────────────────────────────────────────

KEY_ID    = os.environ.get('ASC_KEY_ID', '').strip()
ISSUER_ID = os.environ.get('ASC_ISSUER_ID', '').strip()
P8_PATH   = os.environ.get(
    'ASC_P8_PATH',
    str(Path.home() / 'cronopet-credentials' / f'AuthKey_{KEY_ID}.p8'),
)

APP_ID    = '6770387252'                 # ASC app id (CronoPet)
BUNDLE_ID = 'com.cronopet.app'

BASE = 'https://api.appstoreconnect.apple.com'

# Product IDs canônicos
PROD_MONTHLY = 'com.cronopet.app.premium.monthly'
PROD_ANNUAL  = 'com.cronopet.app.premium.annual'

# Pricing target (BR). Apple usa tiers globais; vamos descobrir o
# tier-id mais próximo de R$ 19,90 / R$ 99,90 via API e setar.
MONTHLY_BR_BRL = 19.90
ANNUAL_BR_BRL  = 99.90

GROUP_REFERENCE_NAME = 'CronoPet Premium'
MONTHLY_REF_NAME     = 'CronoPet Premium Monthly'
ANNUAL_REF_NAME      = 'CronoPet Premium Annual'


# ─── JWT generator ────────────────────────────────────────────────────

def generate_token() -> str:
    """Gera JWT ES256 com payload pra ASC API. Exp 20min."""
    if not KEY_ID or not ISSUER_ID:
        raise SystemExit('ERRO: ASC_KEY_ID e ASC_ISSUER_ID devem estar setados em env vars')

    if not Path(P8_PATH).exists():
        raise SystemExit(f'ERRO: arquivo .p8 não encontrado em: {P8_PATH}\nSetar ASC_P8_PATH manualmente.')

    with open(P8_PATH, 'rb') as f:
        private_key = f.read()

    now = int(time.time())
    payload = {
        'iss': ISSUER_ID,
        'iat': now,
        'exp': now + (20 * 60),       # 20 min — Apple aceita até 20 min
        'aud': 'appstoreconnect-v1',
    }
    headers = {
        'alg': 'ES256',
        'kid': KEY_ID,
        'typ': 'JWT',
    }

    token = jwt.encode(payload, private_key, algorithm='ES256', headers=headers)
    return token


def auth_headers() -> Dict[str, str]:
    return {
        'Authorization': f'Bearer {generate_token()}',
        'Content-Type':  'application/json',
    }


# ─── HTTP helpers ─────────────────────────────────────────────────────

def get(path: str, params: Optional[Dict] = None) -> Dict:
    url = f'{BASE}{path}'
    r = requests.get(url, headers=auth_headers(), params=params, timeout=30)
    if r.status_code >= 400:
        _bail(r, 'GET', path)
    return r.json()


def post(path: str, body: Dict) -> Dict:
    url = f'{BASE}{path}'
    r = requests.post(url, headers=auth_headers(), json=body, timeout=30)
    if r.status_code >= 400:
        _bail(r, 'POST', path, body)
    return r.json() if r.text else {}


def patch(path: str, body: Dict) -> Dict:
    url = f'{BASE}{path}'
    r = requests.patch(url, headers=auth_headers(), json=body, timeout=30)
    if r.status_code >= 400:
        _bail(r, 'PATCH', path, body)
    return r.json() if r.text else {}


def _bail(r: requests.Response, method: str, path: str, body: Optional[Dict] = None) -> None:
    print(f'\n❌ {method} {path} → HTTP {r.status_code}')
    try:
        err = r.json()
        print(json.dumps(err, indent=2))
    except Exception:
        print(r.text[:1000])
    if body:
        print('\nRequest body sent:')
        print(json.dumps(body, indent=2)[:2000])
    sys.exit(1)


# ─── ASC API wrappers ─────────────────────────────────────────────────

def list_apps() -> List[Dict]:
    """Lista todos apps na conta."""
    data = get('/v1/apps')
    return data.get('data', [])


def list_subscription_groups(app_id: str = APP_ID) -> List[Dict]:
    """Lista subscription groups de um app."""
    data = get(f'/v1/apps/{app_id}/subscriptionGroups')
    return data.get('data', [])


def list_subscriptions(group_id: str) -> List[Dict]:
    """Lista subscriptions dentro de um group."""
    data = get(f'/v1/subscriptionGroups/{group_id}/subscriptions')
    return data.get('data', [])


def create_subscription_group(app_id: str, reference_name: str) -> Dict:
    """Cria subscription group novo no app."""
    body = {
        'data': {
            'type': 'subscriptionGroups',
            'attributes': { 'referenceName': reference_name },
            'relationships': {
                'app': { 'data': { 'type': 'apps', 'id': app_id } },
            },
        },
    }
    return post('/v1/subscriptionGroups', body)


def create_subscription(
    group_id: str,
    product_id: str,
    reference_name: str,
    duration: str,   # 'ONE_MONTH' | 'ONE_YEAR' | etc
    group_level: int = 1,
    family_sharable: bool = False,
) -> Dict:
    """Cria subscription dentro de um group."""
    body = {
        'data': {
            'type': 'subscriptions',
            'attributes': {
                'productId':           product_id,
                'name':                reference_name,
                'subscriptionPeriod':  duration,
                'familySharable':      family_sharable,
                'groupLevel':          group_level,
            },
            'relationships': {
                'group': {
                    'data': { 'type': 'subscriptionGroups', 'id': group_id },
                },
            },
        },
    }
    return post('/v1/subscriptions', body)


def add_subscription_localization(
    sub_id: str,
    locale: str,
    name: str,
    description: str,
) -> Dict:
    """Adiciona localization (display name + description) a uma subscription."""
    body = {
        'data': {
            'type': 'subscriptionLocalizations',
            'attributes': {
                'locale':      locale,
                'name':        name,
                'description': description,
            },
            'relationships': {
                'subscription': {
                    'data': { 'type': 'subscriptions', 'id': sub_id },
                },
            },
        },
    }
    return post('/v1/subscriptionLocalizations', body)


def add_subscription_group_localization(
    group_id: str,
    locale: str,
    custom_app_name: str,
) -> Dict:
    """Localization do group (display name agregado)."""
    body = {
        'data': {
            'type': 'subscriptionGroupLocalizations',
            'attributes': {
                'locale':        locale,
                'customAppName': custom_app_name,
                'name':          custom_app_name,
            },
            'relationships': {
                'subscriptionGroup': {
                    'data': { 'type': 'subscriptionGroups', 'id': group_id },
                },
            },
        },
    }
    return post('/v1/subscriptionGroupLocalizations', body)


def list_subscription_pricing_points(sub_id: str, territory: str = 'BRA',
                                     limit: int = 200) -> List[Dict]:
    """Lista pricing points disponíveis (PAGINA completo).
    Apple retorna até 200 por página; default da subscription tem
    ~800 pricePoints. Sem paginação completa, R$ 99,90 não cai nas
    primeiras 200 e find_closest_price_point retorna lixo (R$ 50,90).
    """
    all_pps: List[Dict] = []
    url = f'/v1/subscriptions/{sub_id}/pricePoints?filter[territory]={territory}&limit={limit}'
    while url:
        data = get(url, params=None)
        all_pps.extend(data.get('data', []))
        next_link = data.get('links', {}).get('next')
        if next_link and next_link.startswith(BASE):
            url = next_link.replace(BASE, '')
        else:
            url = None
        if len(all_pps) > 2000:
            break  # safety cap
    return all_pps


def find_closest_price_point(price_points: List[Dict], target_brl: float) -> Optional[Dict]:
    """Acha o pricePoint mais próximo de um valor BRL."""
    best = None
    best_diff = float('inf')
    for pp in price_points:
        attrs = pp.get('attributes', {})
        customer_price = attrs.get('customerPrice', '0')
        try:
            cp_float = float(customer_price)
        except (TypeError, ValueError):
            continue
        diff = abs(cp_float - target_brl)
        if diff < best_diff:
            best_diff = diff
            best = pp
    return best


def create_subscription_price_schedule(
    sub_id: str,
    price_point_id: str,
    territory: str = 'BRA',
) -> Dict:
    """DEPRECATED: alias compat. Use create_subscription_price.
    Apple `/v1/subscriptionPriceSchedules` retornou 404 em tests —
    endpoint não existe nessa rota. Fallback pro endpoint legado."""
    return create_subscription_price(sub_id, price_point_id, territory)


def create_introductory_offer_free_trial(
    sub_id: str,
    territory: str,
    duration: str = 'ONE_WEEK',
) -> Dict:
    """Cria intro offer = free trial 1 semana, new subscribers.
    Apple v3.6+ exige 'numberOfPeriods' explícito (default não rola)."""
    body = {
        'data': {
            'type': 'subscriptionIntroductoryOffers',
            'attributes': {
                'offerMode':           'FREE_TRIAL',
                'duration':            duration,
                'numberOfPeriods':     1,           # 1 ciclo de 7d
                'startDate':           None,        # available now
                'endDate':             None,        # sem expiração da oferta
            },
            'relationships': {
                'subscription': {
                    'data': { 'type': 'subscriptions', 'id': sub_id },
                },
                'territory': {
                    'data': { 'type': 'territories', 'id': territory },
                },
            },
        },
    }
    return post('/v1/subscriptionIntroductoryOffers', body)


# ─── Comandos ─────────────────────────────────────────────────────────

def cmd_list_apps() -> None:
    apps = list_apps()
    print(f'\n📱 Apps na conta ({len(apps)}):\n')
    for a in apps:
        attrs = a.get('attributes', {})
        print(f"  • {attrs.get('name'):30}  bundle={attrs.get('bundleId')}  id={a.get('id')}")


def cmd_list_subscription_groups() -> None:
    groups = list_subscription_groups()
    print(f'\n📦 Subscription Groups do CronoPet ({len(groups)}):\n')
    if not groups:
        print('  (nenhum)')
        return
    for g in groups:
        attrs = g.get('attributes', {})
        gid = g.get('id')
        print(f"  • {attrs.get('referenceName'):30}  id={gid}")
        subs = list_subscriptions(gid)
        for s in subs:
            sa = s.get('attributes', {})
            print(f"      └─ {sa.get('productId'):45}  state={sa.get('state')}")


def _try_step(label: str, fn) -> None:
    """Roda fn() e captura SystemExit (que vem do _bail em conflict 409
    ou erro Apple). Permite re-runs idempotentes do create-products."""
    try:
        fn()
        print(f'     ↪ {label} OK')
    except SystemExit:
        # Já existe ou outro erro recuperável — segue.
        print(f'     ⚠️ {label} pulado (provável já existir)')


def create_subscription_availability(sub_id: str, territory: str = 'BRA') -> Dict:
    """Define em quais territórios a subscription está available.
    PRECONDIÇÃO obrigatória pra price + intro offers (Apple 2024+)."""
    body = {
        'data': {
            'type': 'subscriptionAvailabilities',
            'attributes': { 'availableInNewTerritories': True },
            'relationships': {
                'subscription': {
                    'data': { 'type': 'subscriptions', 'id': sub_id },
                },
                'availableTerritories': {
                    'data': [{ 'type': 'territories', 'id': territory }],
                },
            },
        },
    }
    return post('/v1/subscriptionAvailabilities', body)


def create_subscription_price(sub_id: str, price_point_id: str,
                              territory: str = 'BRA') -> Dict:
    """Aplica pricing via endpoint /v1/subscriptionPrices (legado mas
    funcional desde que availability esteja setada antes)."""
    body = {
        'data': {
            'type': 'subscriptionPrices',
            'relationships': {
                'subscription': {
                    'data': { 'type': 'subscriptions', 'id': sub_id },
                },
                'subscriptionPricePoint': {
                    'data': { 'type': 'subscriptionPricePoints', 'id': price_point_id },
                },
                'territory': {
                    'data': { 'type': 'territories', 'id': territory },
                },
            },
        },
    }
    return post('/v1/subscriptionPrices', body)


def _setup_subscription(sub_id: str, name_ptbr: str, description_ptbr: str,
                        target_brl: float) -> None:
    """Aplica localization PT-BR + availability BRA + price BR + trial.
    Idempotente: cada chamada que conflict (409) é tolerada.
    Ordem importa: availability ANTES de price e trial."""

    _try_step(
        'pt-BR localization',
        lambda: add_subscription_localization(sub_id, 'pt-BR', name_ptbr, description_ptbr),
    )

    _try_step(
        'Availability BRA',
        lambda: create_subscription_availability(sub_id, 'BRA'),
    )

    # Price BR — paginação completa (find_closest_price_point lê tudo
    # via list_subscription_pricing_points paginado)
    pps = list_subscription_pricing_points(sub_id, 'BRA', limit=200)
    pp = find_closest_price_point(pps, target_brl)
    if pp:
        attrs = pp.get('attributes', {})
        _try_step(
            f"BR price R$ {attrs.get('customerPrice')}",
            lambda: create_subscription_price(sub_id, pp['id'], 'BRA'),
        )
    else:
        print('     ⚠️ Nenhum pricePoint BR encontrado')

    _try_step(
        'Free trial 7d (BRA, new subscribers)',
        lambda: create_introductory_offer_free_trial(sub_id, 'BRA', 'ONE_WEEK'),
    )


def cmd_create_products() -> None:
    print('\n🚀 Criando produtos IAP do CronoPet…\n')

    # 1. Subscription group
    existing = list_subscription_groups()
    group = next(
        (g for g in existing
         if g.get('attributes', {}).get('referenceName') == GROUP_REFERENCE_NAME),
        None,
    )
    if group:
        gid = group['id']
        print(f'  ⚠️  Group "{GROUP_REFERENCE_NAME}" já existe (id={gid}) — reutilizando.')
    else:
        resp = create_subscription_group(APP_ID, GROUP_REFERENCE_NAME)
        gid = resp['data']['id']
        print(f'  ✅ Subscription Group criado (id={gid})')

    # Group localizations (idempotente)
    _try_step('Group pt-BR localization',
              lambda: add_subscription_group_localization(gid, 'pt-BR', GROUP_REFERENCE_NAME))
    _try_step('Group en-US localization',
              lambda: add_subscription_group_localization(gid, 'en-US', GROUP_REFERENCE_NAME))

    # 2. Monthly subscription
    existing_subs = list_subscriptions(gid)
    monthly = next(
        (s for s in existing_subs
         if s.get('attributes', {}).get('productId') == PROD_MONTHLY),
        None,
    )
    if monthly:
        mid = monthly['id']
        print(f'\n  ⚠️  Monthly "{PROD_MONTHLY}" já existe (id={mid}) — reutilizando.')
    else:
        resp = create_subscription(
            gid, PROD_MONTHLY, MONTHLY_REF_NAME,
            duration='ONE_MONTH', group_level=1, family_sharable=False,
        )
        mid = resp['data']['id']
        print(f'\n  ✅ Monthly subscription criada (id={mid})')

    _setup_subscription(
        mid,
        name_ptbr='Premium Mensal',
        description_ptbr='Insights de IA, PDF do vet e histórico.',
        target_brl=MONTHLY_BR_BRL,
    )

    # 3. Annual subscription
    annual = next(
        (s for s in existing_subs
         if s.get('attributes', {}).get('productId') == PROD_ANNUAL),
        None,
    )
    if annual:
        aid = annual['id']
        print(f'\n  ⚠️  Annual "{PROD_ANNUAL}" já existe (id={aid}) — reutilizando.')
    else:
        resp = create_subscription(
            gid, PROD_ANNUAL, ANNUAL_REF_NAME,
            duration='ONE_YEAR', group_level=2, family_sharable=False,
        )
        aid = resp['data']['id']
        print(f'\n  ✅ Annual subscription criada (id={aid})')

    _setup_subscription(
        aid,
        name_ptbr='Premium Anual',
        description_ptbr='Economia 58%. IA, PDF do vet, histórico.',
        target_brl=ANNUAL_BR_BRL,
    )

    print('\n✨ Done.\n')


def cmd_validate_products() -> None:
    print('\n🔍 Validating produtos IAP do CronoPet…\n')
    groups = list_subscription_groups()
    target = next(
        (g for g in groups
         if g.get('attributes', {}).get('referenceName') == GROUP_REFERENCE_NAME),
        None,
    )
    if not target:
        print(f'  ❌ Subscription Group "{GROUP_REFERENCE_NAME}" não existe')
        sys.exit(1)
    gid = target['id']
    print(f'✅ Group "{GROUP_REFERENCE_NAME}" (id={gid})\n')

    subs = list_subscriptions(gid)
    for product_id in (PROD_MONTHLY, PROD_ANNUAL):
        s = next(
            (x for x in subs
             if x.get('attributes', {}).get('productId') == product_id),
            None,
        )
        if not s:
            print(f'  ❌ Product {product_id} NÃO ENCONTRADO\n')
            continue
        attrs = s.get('attributes', {})
        sid = s['id']
        print(f"📦 {product_id}")
        print(f"   id={sid}  state={attrs.get('state')}  period={attrs.get('subscriptionPeriod')}")

        # Sub-resources (localizations, prices, offers, availability)
        for name, path in [
            ('localizations',     f'/v1/subscriptions/{sid}/subscriptionLocalizations'),
            ('prices',            f'/v1/subscriptions/{sid}/prices'),
            ('intro offers',      f'/v1/subscriptions/{sid}/introductoryOffers'),
            ('availability',      f'/v1/subscriptions/{sid}/subscriptionAvailability'),
        ]:
            try:
                data = get(path).get('data', [])
                if isinstance(data, list):
                    print(f"   ↪ {name}: {len(data)} entries")
                elif data:
                    print(f"   ↪ {name}: present (id={data.get('id')})")
                else:
                    print(f"   ↪ {name}: empty")
            except SystemExit:
                print(f"   ↪ {name}: query failed")
        print()


# ─── Entry point ──────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == 'list-apps':                 cmd_list_apps()
    elif cmd == 'list-subscription-groups': cmd_list_subscription_groups()
    elif cmd == 'create-products':         cmd_create_products()
    elif cmd == 'validate-products':       cmd_validate_products()
    else:
        print(f'Comando desconhecido: {cmd}\n')
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()
