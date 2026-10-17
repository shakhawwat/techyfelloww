'use client';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useState, useEffect, useRef, type ReactNode} from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
  Package,
  Sparkles,
  Tag,
  Boxes,
  FileText,
  HelpCircle,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import {useAccountSession} from '@/components/account/session';
import {useStore} from './provider';
import {money, productHref, type StoreCategory, type StoreProduct} from './types';
import styles from './store.module.css';

export function StoreShell({children, categories}:{children:ReactNode;categories:StoreCategory[]}){
  const {session,logout}=useAccountSession(),
    {state,error,refresh}=useStore(),
    [menu,setMenu]=useState(false),
    [accountError,setAccountError]=useState(''),
    [searchQuery,setSearchQuery]=useState(''),
    [suggestions,setSuggestions]=useState<StoreProduct[]>([]),
    [searchLoading,setSearchLoading]=useState(false),
    [showSuggestions,setShowSuggestions]=useState(false),
    [selectedIndex,setSelectedIndex]=useState(-1),
    searchContainerRef=useRef<HTMLDivElement>(null),
    searchInputRef=useRef<HTMLInputElement>(null),
    debounceTimerRef=useRef<NodeJS.Timeout|null>(null),
    abortCtrlRef=useRef<AbortController|null>(null),
    router=useRouter(),
    pathname=usePathname();

  const login='/login?returnTo='+encodeURIComponent(pathname),
    close=()=>setMenu(false);

  const count=(type:'cartCount'|'wishlistCount')=>
    session.status==='anonymous'?0:state?.[type]??'—';

  // Debounced live search suggestions
  function handleSearchInput(e:React.ChangeEvent<HTMLInputElement>){
    const value=e.target.value;
    setSearchQuery(value);
    setSelectedIndex(-1);
    if(debounceTimerRef.current)clearTimeout(debounceTimerRef.current);
    if(abortCtrlRef.current)abortCtrlRef.current.abort();

    const trimmed=value.trim();
    if(trimmed.length<2){
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setShowSuggestions(true);
    debounceTimerRef.current=setTimeout(async()=>{
      const controller=new AbortController();
      abortCtrlRef.current=controller;
      try{
        const base=process.env.NEXT_PUBLIC_API_BASE_URL??'/api/v1';
        const res=await fetch(base+'/store/catalog?search='+encodeURIComponent(trimmed)+'&limit=5',{
          signal:controller.signal,
          headers:{'Accept':'application/json'},
        });
        if(res.ok){
          const json=await res.json();
          setSuggestions(json.data??[]);
        }
      }catch{
        // Ignore aborted requests
      }finally{
        if(!controller.signal.aborted){
          setSearchLoading(false);
        }
      }
    },200);
  }

  function handleSearchKeyDown(e:React.KeyboardEvent<HTMLInputElement>){
    if(!showSuggestions||suggestions.length===0){
      if(e.key==='Escape')setShowSuggestions(false);
      return;
    }
    if(e.key==='ArrowDown'){
      e.preventDefault();
      setSelectedIndex(prev=>prev<suggestions.length-1?prev+1:0);
    }else if(e.key==='ArrowUp'){
      e.preventDefault();
      setSelectedIndex(prev=>prev>0?prev-1:suggestions.length-1);
    }else if(e.key==='Enter'&&selectedIndex>=0&&selectedIndex<suggestions.length){
      e.preventDefault();
      const product=suggestions[selectedIndex];
      setShowSuggestions(false);
      router.push(productHref(product));
    }else if(e.key==='Escape'){
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }

  function clearSearch(){
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  }

  useEffect(()=>{
    function handleClickOutside(e:MouseEvent){
      if(searchContainerRef.current&&!searchContainerRef.current.contains(e.target as Node)){
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown',handleClickOutside);
    return()=>{
      document.removeEventListener('mousedown',handleClickOutside);
      if(debounceTimerRef.current)clearTimeout(debounceTimerRef.current);
      if(abortCtrlRef.current)abortCtrlRef.current.abort();
    };
  },[]);

  return (
    <div className={styles.store} data-store-layout>
      <header className={styles.navbar} data-store-navbar>
        {/* Top utility bar */}
        <div className={styles.utility}>
          <div className={styles.utilityLeft}>
            <span className={styles.companyName}>Techyfellow Technology Ltd.</span>
            <span className={styles.utilityDivider}>·</span>
            <Link href="/" className={styles.backLink}>
              <ArrowLeft size={13}/>
              <span>Back to Techyfellow</span>
            </Link>
          </div>
          <div className={styles.utilityRight}>
            <Link href="/contact" className={styles.supportLink}>
              <HelpCircle size={12}/>
              <span>Customer Support</span>
            </Link>
            <span className={styles.utilityDivider}>·</span>
            {session.status==='authenticated'?(
              <Link href="/account/profile" className={styles.utilityAccount}>
                <UserRound size={12}/>
                <span>{session.user?.name??'My Profile'}</span>
              </Link>
            ):(
              <Link href={login} className={styles.utilityAccount}>
                <UserRound size={12}/>
                <span>Account Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {/* Main navigation */}
        <div className={styles.navMain}>
          <Link href="/store" className={styles.logo} aria-label="Techyfellow Store" onClick={close}>
            <Image
              src="/brand/icon_logo.jpeg"
              alt="TF"
              width={46}
              height={46}
              loading="eager"
              fetchPriority="high"
              unoptimized
            />
            <span>
              Techyfellow
              <strong>ROBOTICS STORE</strong>
            </span>
          </Link>

          {/* Search bar with debounced suggestions */}
          <div className={styles.searchWrapper} ref={searchContainerRef}>
            <form action="/store/products" role="search" className={styles.search} onSubmit={()=>setShowSuggestions(false)}>
              <input
                ref={searchInputRef}
                type="search"
                name="search"
                aria-label="Search products"
                placeholder="Search boards, sensors, kits, ICs, motors…"
                maxLength={100}
                autoComplete="off"
                value={searchQuery}
                onChange={handleSearchInput}
                onKeyDown={handleSearchKeyDown}
                onFocus={()=>{
                  if(searchQuery.trim().length>=2&&suggestions.length>0)setShowSuggestions(true);
                }}
              />
              {searchQuery&&(
                <button
                  type="button"
                  className={styles.searchClearBtn}
                  aria-label="Clear search input"
                  onClick={clearSearch}
                >
                  <X size={16}/>
                </button>
              )}
              <button aria-label="Search Store" type="submit">
                <Search size={20}/>
              </button>
            </form>

            {/* Live Search Suggestions Dropdown */}
            {showSuggestions&&searchQuery.trim().length>=2&&(
              <div className={styles.searchSuggestions} role="listbox" id="search-suggestions-list">
                {searchLoading?(
                  <div className={styles.searchStatus}>Searching catalog…</div>
                ):suggestions.length>0?(
                  <>
                    <div className={styles.searchSuggestionsHeader}>Matching Products</div>
                    {suggestions.map((item,idx)=>{
                      const itemImg=item.media.find(m=>m.type==='image'&&m.url);
                      return (
                        <Link
                          key={item.id}
                          href={productHref(item)}
                          className={`${styles.suggestionItem} ${idx===selectedIndex?styles.suggestionSelected:''}`}
                          role="option"
                          aria-selected={idx===selectedIndex}
                          onClick={()=>setShowSuggestions(false)}
                        >
                          <div className={styles.suggestionThumb}>
                            {itemImg?.url?(
                              <Image src={itemImg.url} alt={item.title} width={38} height={38} unoptimized/>
                            ):(
                              <Cpu size={18}/>
                            )}
                          </div>
                          <div className={styles.suggestionInfo}>
                            <span className={styles.suggestionTitle}>{item.title}</span>
                            <span className={styles.suggestionMeta}>
                              {item.sku?item.sku+' · ':''}{money(item.priceMinor)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                    <Link
                      href={'/store/products?search='+encodeURIComponent(searchQuery.trim())}
                      className={styles.suggestionViewAll}
                      onClick={()=>setShowSuggestions(false)}
                    >
                      View all results for &ldquo;{searchQuery.trim()}&rdquo; &rarr;
                    </Link>
                  </>
                ):(
                  <div className={styles.searchStatus}>No products found for &ldquo;{searchQuery.trim()}&rdquo;</div>
                )}
              </div>
            )}
          </div>

          {/* Account, Wishlist, Cart actions */}
          <nav aria-label="Store account and cart" className={styles.navActions}>
            {session.status==='authenticated'?(
              <details
                className={styles.dropdown}
                onKeyDown={event=>{
                  if(event.key==='Escape'){
                    event.currentTarget.open=false;
                    event.currentTarget.querySelector('summary')?.focus();
                  }
                }}
              >
                <summary aria-label="Store account">
                  <UserRound size={20}/>
                  <span>Account</span>
                </summary>
                <div>
                  <strong>{session.user?.name??'Your account'}</strong>
                  <Link href="/account/profile">My profile</Link>
                  <Link href="/store/orders">Order requests</Link>
                  <button
                    onClick={()=>
                      void logout().catch(()=>setAccountError('Sign-out could not be confirmed. Retry.'))
                    }
                  >
                    Log out
                  </button>
                </div>
              </details>
            ):(
              <Link href={login}>
                <UserRound size={20}/>
                <span>Sign in</span>
              </Link>
            )}

            <Link href="/store/wishlist" aria-label={`Wishlist, ${count('wishlistCount')} items`}>
              <Heart size={20}/>
              <span>
                Wishlist <b>{count('wishlistCount')}</b>
              </span>
            </Link>

            <Link href="/store/cart" aria-label={`Cart, ${count('cartCount')} items`}>
              <ShoppingCart size={20}/>
              <span>
                Cart <b>{count('cartCount')}</b>
              </span>
            </Link>
          </nav>
        </div>

        {/* Category navigation bar */}
        <div className={styles.categoryBar}>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label={menu?'Close store categories':'Open store categories'}
            aria-expanded={menu}
            aria-controls="store-category-menu"
            onClick={()=>setMenu(value=>!value)}
          >
            {menu?<X size={19}/>:<Menu size={19}/>}
            <span>Categories</span>
          </button>

          <nav
            id="store-category-menu"
            aria-label="Store categories"
            className={styles.categories}
            data-open={menu}
            onKeyDown={event=>{
              if(event.key==='Escape'){
                setMenu(false);
                document.querySelector<HTMLButtonElement>('[aria-controls="store-category-menu"]')?.focus();
              }
            }}
          >
            <Link href="/store/products" onClick={close} className={styles.navCategoryMain}>
              <Boxes size={14}/>
              <span>All products</span>
            </Link>
            <Link href="/store/kits" onClick={close} className={styles.navCategoryLink}>
              <Package size={14}/>
              <span>Robotics Kits</span>
            </Link>
            {categories
              .filter(category=>!category.parent)
              .map(category=>{
                const children=categories.filter(child=>child.parent===category.slug);
                return children.length?(
                  <details
                    key={category.slug}
                    className={styles.dropdown}
                    onKeyDown={event=>{
                      if(event.key==='Escape'){
                        event.currentTarget.open=false;
                        event.currentTarget.querySelector('summary')?.focus();
                        event.stopPropagation();
                      }
                    }}
                  >
                    <summary>
                      <span>{category.name}</span>
                      <ChevronDown size={13}/>
                    </summary>
                    <div>
                      <Link href={'/store/products?category='+category.slug} onClick={close}>
                        All {category.name.toLowerCase()}
                      </Link>
                      {children.map(child=>(
                        <Link key={child.slug} href={'/store/products?category='+child.slug} onClick={close}>
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </details>
                ):(
                  <Link key={category.slug} href={'/store/products?category='+category.slug} onClick={close}>
                    {category.name}
                  </Link>
                );
              })}
            <Link href="/store/products?sort=newest" onClick={close} className={styles.navCategoryLink}>
              <Sparkles size={14}/>
              <span>New Arrivals</span>
            </Link>
            <Link href="/store/products?offers=true" onClick={close} className={styles.navCategoryLink}>
              <Tag size={14}/>
              <span>Special Offers</span>
            </Link>
            <Link href="/" onClick={close} className={styles.navBackCorporate} aria-label="Back to Techyfellow">
              <ArrowLeft size={14}/>
              <span>Back to Techyfellow</span>
            </Link>
          </nav>


          <Link className={styles.ordersShortcut} href="/store/orders">
            <FileText size={14}/>
            <span>My requests</span>
          </Link>
        </div>
      </header>

      {(error||accountError)&&(
        <div className={styles.globalError} role="alert">
          <span>{error||accountError}</span>
          {error&&<button onClick={()=>void refresh()}>Reload cart</button>}
        </div>
      )}

      <div className={styles.body}>{children}</div>

      <footer className={styles.footer} data-store-footer>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrandCol}>
            <Link className={styles.footerBrand} href="/store">
              Techyfellow Store
            </Link>
            <p>
              Hardware for learning, prototyping and building. Verified microcontrollers, sensors, actuators, and maker kits by Techyfellow Technology Ltd.
            </p>
            <div className={styles.footerBadge}>
              <ShieldCheck size={16}/>
              <span>100% Genuine Hardware & Staff-Reviewed Orders</span>
            </div>
            <small>
              All store order requests are manually reviewed by engineering staff before payment and fulfillment.
            </small>
          </div>

          <div className={styles.footerCol}>
            <h3>Catalog Navigation</h3>
            <nav aria-label="Store catalog links">
              <Link href="/store/products">All Products</Link>
              <Link href="/store/kits">Robotics Kits</Link>
              <Link href="/store/products?category=development-boards">Development Boards</Link>
              <Link href="/store/products?category=sensors">Sensors & Modules</Link>
              <Link href="/store/products?category=motors-drivers">Motors & Drivers</Link>
              <Link href="/store/products?offers=true">Discounted Offers</Link>
            </nav>
          </div>

          <div className={styles.footerCol}>
            <h3>Customer & Requests</h3>
            <nav aria-label="Customer service links">
              <Link href="/store/cart">Shopping Cart</Link>
              <Link href="/store/wishlist">Saved Wishlist</Link>
              <Link href="/store/orders">Track Order Requests</Link>
              <Link href="/account/profile">Member Profile</Link>
              <Link href="/contact">Hardware Consultation</Link>
            </nav>
          </div>

          <div className={styles.footerCol}>
            <h3>Techyfellow Hub</h3>
            <nav aria-label="Corporate links">
              <Link href="/">Techyfellow Corporate</Link>
              <Link href="/academy">Techyfellow Academy</Link>
              <Link href="/research">Research & Development</Link>
              <Link href="/solutions">Engineering Solutions</Link>
              <Link href="/about">About Our Mission</Link>
            </nav>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} Techyfellow Technology Ltd. All rights reserved. Dhaka, Bangladesh.</p>
          <div className={styles.footerBottomLinks}>
            <Link href="/contact">Support</Link>
            <span>·</span>
            <Link href="/store">Store Home</Link>
            <span>·</span>
            <Link href="/">Back to Techyfellow</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
