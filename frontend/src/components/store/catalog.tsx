import Link from 'next/link';
import {
  Cpu,
  ArrowRight,
  SlidersHorizontal,
  ShieldCheck,
  CreditCard,
  Truck,
  Headphones,
  Activity,
  Boxes,
  RotateCcw,
  CircuitBoard,
  Wrench,
  BatteryCharging,
  Cable,
  Tag,
  X,
} from 'lucide-react';

import {ProductGrid} from './products';
import {StoreHeroSlider} from './slider';
import {storeGet} from './server';
import type {Catalog,StoreCategory,StoreHome} from './types';
import styles from './store.module.css';

export type StoreQuery=Record<string,string|string[]|undefined>;

function queryOf(query:StoreQuery){
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries(query)){
    if(typeof value==='string'&&value&&['search','category','min','max','availability','sort','page'].includes(key)){
      params.set(key,value);
    }
  }
  return params;
}

export function StoreUnavailable(){
  return (
    <main id="public-main" className={styles.page}>
      <h1>Store temporarily unavailable</h1>
      <p role="alert">Catalog data could not be loaded. Please reload to retry.</p>
      <Link href="/store" className={styles.primary}>Reload Store</Link>
    </main>
  );
}

function categoryIcon(slug:string){
  switch(slug){
    case 'development-boards':
      return <Cpu size={24}/>;
    case 'sensors':
      return <Activity size={24}/>;
    case 'robotics-kits':
      return <Boxes size={24}/>;
    case 'motors-drivers':
      return <RotateCcw size={24}/>;
    case 'components':
      return <CircuitBoard size={24}/>;
    case 'tools':
      return <Wrench size={24}/>;
    case 'power-supplies-batteries':
      return <BatteryCharging size={24}/>;
    case 'accessories':
      return <Cable size={24}/>;
    default:
      return <Cpu size={24}/>;
  }
}

export async function StoreHomepage(){
  const result=await storeGet<{data:StoreHome}>('home');
  if(!result.data)return <StoreUnavailable/>;

  const home=result.data.data;

  return (
    <main id="public-main" className={styles.homepageMain}>
      {/* Hero promotional slider - Full width 100%, 20dvh desktop, 30dvh mobile */}
      <StoreHeroSlider banner={home.banner}/>

      {/* Store catalog sections wrapped inside constrained content container */}
      <div className={styles.page}>
        {/* B. Shop by Category */}
        {home.categories.length>0&&(
          <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>DISCOVER HARDWARE</p>
              <h2>Shop by category</h2>
            </div>
            <Link href="/store/products">
              All products<ArrowRight size={15}/>
            </Link>
          </div>
          <div className={styles.categoryGrid}>
            {home.categories
              .filter(category=>!category.parent)
              .map(category=>(
                <Link href={'/store/products?category='+category.slug} key={category.slug} className={styles.categoryCard}>
                  <div className={styles.categoryIconWrap}>
                    {categoryIcon(category.slug)}
                  </div>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryName}>{category.name}</span>
                    <small className={styles.categoryCount}>
                      {category.count?`${category.count} published`:'Explore hardware'}
                    </small>
                  </div>
                  <ArrowRight size={16} className={styles.categoryArrow}/>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* C. Featured Products */}
      {home.featured.length>0&&(
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>STAFF PICKS</p>
              <h2>Featured products</h2>
            </div>
            <Link href="/store/products">
              Browse all<ArrowRight size={15}/>
            </Link>
          </div>
          <ProductGrid products={home.featured}/>
        </section>
      )}

      {/* D. New Arrivals */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>LATEST HARDWARE</p>
            <h2>New arrivals</h2>
          </div>
          <Link href="/store/products?sort=newest">
            View catalog<ArrowRight size={15}/>
          </Link>
        </div>
        {home.arrivals.length?(
          <ProductGrid products={home.arrivals}/>
        ):(
          <div className={styles.empty}>
            <Cpu size={36}/>
            <h3>The catalog is getting ready</h3>
            <p>No products have been published yet. Contact us about your hardware requirements.</p>
            <Link href="/contact" className={styles.primary}>Discuss your project</Link>
          </div>
        )}
      </section>

      {/* E. Promotional offers */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>SPECIAL DISCOUNTS</p>
            <h2>Promotional offers</h2>
          </div>
          {home.offers.length>0&&(
            <Link href="/store/products?sort=price-asc">
              Compare prices<ArrowRight size={15}/>
            </Link>
          )}
        </div>
        {home.offers.length>0?(
          <ProductGrid products={home.offers}/>
        ):(
          <div className={styles.offersEmpty}>
            <Tag size={28} className={styles.emptyIcon}/>
            <h3>No promotional offers currently active</h3>
            <p>All items are cataloged at genuine baseline BDT rates. Check back soon for seasonal discounts on robotics hardware.</p>
            <Link href="/store/products" className={styles.secondaryBtn}>Browse all catalog products</Link>
          </div>
        )}
      </section>

      {/* F. Trust and service information */}
      <section className={styles.section} aria-label="Store guarantees">
        <div className={styles.orderNote}>
          <strong>Browse. Build your cart. Request confirmation.</strong>
          <span>No online payment. Staff confirm stock, delivery cost and your final order.</span>
        </div>
        <div className={styles.featurePillars}>
          <div className={styles.featureCard}>
            <ShieldCheck size={28} className={styles.featureIcon}/>
            <div>
              <h3>100% Genuine Components</h3>
              <p>Verified microcontrollers, sensors, actuators and modules from authentic makers.</p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <CreditCard size={28} className={styles.featureIcon}/>
            <div>
              <h3>Transparent BDT Pricing</h3>
              <p>Direct minor-unit BDT pricing with no hidden charges. Genuine compare-at savings.</p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <Truck size={28} className={styles.featureIcon}/>
            <div>
              <h3>Staff Order Review</h3>
              <p>Inventory, compatibility and shipping costs verified before any commitment.</p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <Headphones size={28} className={styles.featureIcon}/>
            <div>
              <h3>Maker & Academy Support</h3>
              <p>Backed by Techyfellow engineers with pinouts, datasheets and project guidance.</p>
            </div>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}

export async function StoreCatalog({
  query={},
  kits=false,
}:{
  query?:StoreQuery;
  kits?:boolean;
}){
  const params=queryOf(query),
    [result,categories]=await Promise.all([
      storeGet<Catalog>('catalog?'+params),
      storeGet<{data:StoreCategory[]}>('categories'),
    ]);

  if(!result.data)return <StoreUnavailable/>;
  const catalog=result.data;

  const href=(page:number)=>{
    const next=new URLSearchParams(params);
    next.set('page',String(page));
    return '/store/products?'+next;
  };

  const selectedCategory=categories.data?.data.find(c=>c.slug===params.get('category'));
  const hasActiveFilters=Boolean(
    params.get('search')||
    params.get('category')||
    params.get('min')||
    params.get('max')||
    (params.get('availability')&&params.get('availability')!=='all')||
    (params.get('sort')&&params.get('sort')!=='newest')
  );

  return (
    <main id="public-main" className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/store">Store</Link>
        <span>/</span>
        <span>{kits?'Robotics Kits':'Catalog'}</span>
        {selectedCategory&&<span>/ {selectedCategory.name}</span>}
      </nav>

      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>ROBOTICS & ELECTRONICS</p>
          <h1>{kits?'Kits & robotics catalog':'Shop the catalog'}</h1>
          <p>{catalog.pagination.total} published products</p>
        </div>
      </div>

      {hasActiveFilters&&(
        <div className={styles.activeFiltersBar} aria-label="Active filters">
          <span className={styles.activeFiltersLabel}>Filters applied:</span>
          {params.get('search')&&(
            <span className={styles.filterChip}>
              Search: &ldquo;{params.get('search')}&rdquo;
            </span>
          )}
          {selectedCategory&&(
            <span className={styles.filterChip}>
              Category: {selectedCategory.name}
            </span>
          )}
          {(params.get('min')||params.get('max'))&&(
            <span className={styles.filterChip}>
              Price: ৳{params.get('min')||0} &ndash; ৳{params.get('max')||'∞'}
            </span>
          )}
          {params.get('availability')==='in-stock'&&(
            <span className={styles.filterChip}>In stock only</span>
          )}
          <Link href={kits?'/store/kits':'/store/products'} className={styles.clearFilterChip}>
            <X size={12}/> Clear all
          </Link>
        </div>
      )}

      <div className={styles.catalogLayout}>
        <aside className={styles.filters}>
          <h2>
            <SlidersHorizontal size={17}/>Find your components
          </h2>
          <form action="/store/products">
            <label>
              Search
              <input
                name="search"
                type="search"
                placeholder="Product or SKU"
                maxLength={100}
                defaultValue={params.get('search')??''}
              />
            </label>

            <label>
              Category
              <select name="category" defaultValue={params.get('category')??''}>
                <option value="">All categories</option>
                {categories.data?.data.map(category=>(
                  <option key={category.slug} value={category.slug}>
                    {category.parent?'↳ ':''}{category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.priceFilters}>
              <label>
                Min BDT
                <input
                  type="number"
                  name="min"
                  min="0"
                  step="0.01"
                  defaultValue={params.get('min')??''}
                />
              </label>
              <label>
                Max BDT
                <input
                  type="number"
                  name="max"
                  min="0"
                  step="0.01"
                  defaultValue={params.get('max')??''}
                />
              </label>
            </div>

            <label>
              Availability
              <select name="availability" defaultValue={params.get('availability')??'all'}>
                <option value="all">All products</option>
                <option value="in-stock">In stock, orderable</option>
              </select>
            </label>

            <label>
              Sort by
              <select name="sort" defaultValue={params.get('sort')??'newest'}>
                <option value="newest">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>

            <button className={styles.primary}>Apply filters</button>
            <Link href="/store/products">Reset filters</Link>
          </form>
        </aside>

        <section aria-label="Product results">
          {catalog.data.length?(
            <ProductGrid products={catalog.data}/>
          ):(
            <div className={styles.empty}>
              <h2>No matching products</h2>
              <p>Try a broader search or clear your filters.</p>
              <Link href="/store/products" className={styles.primary}>Clear filters</Link>
            </div>
          )}

          {catalog.pagination.totalPages>1&&(
            <nav className={styles.pagination} aria-label="Catalog pages">
              {catalog.pagination.page>1&&(
                <Link href={href(catalog.pagination.page-1)}>Previous</Link>
              )}
              <span>
                Page {catalog.pagination.page} of {catalog.pagination.totalPages}
              </span>
              {catalog.pagination.page<catalog.pagination.totalPages&&(
                <Link href={href(catalog.pagination.page+1)}>Next</Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
