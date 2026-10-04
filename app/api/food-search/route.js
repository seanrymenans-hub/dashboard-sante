import { rejectUntrusted } from '../../../lib/security/requestGuard'

function normalizedProduct(product) {
  const n = product?.nutriments || {}
  const kcal = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0)
  const proteines = Number(n.proteins_100g ?? 0)
  const glucides = Number(n.carbohydrates_100g ?? 0)
  const lipides = Number(n.fat_100g ?? 0)
  if (!product?.product_name || !Number.isFinite(kcal) || kcal <= 0) return null
  return {
    code: product.code || null,
    nom: product.product_name,
    marque: product.brands || '',
    portion: product.serving_size || null,
    per100g: {
      kcal: Math.round(kcal),
      proteines: Math.round(proteines * 10) / 10,
      glucides: Math.round(glucides * 10) / 10,
      lipides: Math.round(lipides * 10) / 10,
    }
  }
}

export async function GET(request) {
  const rejected = rejectUntrusted(request)
  if (rejected) return rejected
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('query') || '').trim()
  if (!query) return Response.json({ products: [] })

  try {
    let data
    if (/^\d{8,14}$/.test(query)) {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(query)}?fields=code,product_name,brands,serving_size,nutriments`, { next: { revalidate: 86400 } })
      data = await r.json()
      const item = normalizedProduct(data?.product)
      return Response.json({ products: item ? [item] : [] })
    }

    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,brands,serving_size,nutriments`, { cache: 'no-store' })
    data = await r.json()
    const products = (data?.products || []).map(normalizedProduct).filter(Boolean).slice(0, 8)
    return Response.json({ products })
  } catch (e) {
    console.error('OpenFoodFacts search error', e)
    return Response.json({ error: 'Recherche produit indisponible' }, { status: 502 })
  }
}
