// Frontend usage examples for the new search endpoints

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// ==================== SEARCH COUNTRIES ====================
// Search for countries by name or code
async function searchCountries(query) {
  try {
    const url = `${API_URL}/api/5sim/search/countries?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('Countries found:', data);
    return data;
  } catch (error) {
    console.error('Search countries error:', error);
    return {};
  }
}

// Examples:
// searchCountries('russia')      // Search by country name
// searchCountries('rus')         // Partial name search
// searchCountries('us')          // Country code
// searchCountries('+7')          // Phone prefix search
// searchCountries('kenya')       // Another country

// ==================== SEARCH SERVICES ====================
// Search services with multiple filters
async function searchServices(filters = {}) {
  try {
    const params = new URLSearchParams({
      country: filters.country || 'russia',
      // Optional filters:
      ...(filters.product && { product: filters.product }),
      ...(filters.operator && { operator: filters.operator }),
      ...(filters.minPrice && { minPrice: filters.minPrice }),
      ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
      ...(filters.minCount && { minCount: filters.minCount }),
      ...(filters.sortBy && { sortBy: filters.sortBy })
    });

    const url = `${API_URL}/api/5sim/search/services?${params}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('Services found:', data);
    return data;
  } catch (error) {
    console.error('Search services error:', error);
    return { results: [] };
  }
}

// Examples:
// Get all services for a country
// searchServices({ country: 'russia' })

// Get only cheap Facebook services
// searchServices({
//   country: 'russia',
//   product: 'facebook',
//   maxPrice: 5,
//   sortBy: 'price-asc'
// })

// Get Telegram services with available count >= 100
// searchServices({
//   country: 'usa',
//   product: 'telegram',
//   minCount: 100,
//   sortBy: 'count-desc'
// })

// Combine multiple filters
// searchServices({
//   country: 'ukraine',
//   product: 'facebook',
//   operator: 'virtual1',
//   minPrice: 2,
//   maxPrice: 4,
//   sortBy: 'price-asc'
// })

// ==================== REACT HOOK EXAMPLE ====================
// Usage in a React component:

/*
import { useState, useEffect } from 'react';

function CountrySearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setLoading(true);
        const results = await searchCountries(searchQuery);
        setCountries(results);
        setLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search countries..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {loading && <p>Loading...</p>}
      <ul>
        {Object.entries(countries).map(([code, data]) => (
          <li key={code}>
            {data.text_en} (+{Object.keys(data.prefix)[0]})
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceSearch() {
  const [country, setCountry] = useState('russia');
  const [filters, setFilters] = useState({});
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const results = await searchServices({
      country,
      ...filters
    });
    setServices(results.results || []);
    setLoading(false);
  };

  return (
    <div>
      <select value={country} onChange={(e) => setCountry(e.target.value)}>
        <option value="russia">Russia</option>
        <option value="usa">USA</option>
        <option value="ukraine">Ukraine</option>
      </select>

      <select
        value={filters.product || ''}
        onChange={(e) => setFilters({ ...filters, product: e.target.value })}>
        <option value="">All Products</option>
        <option value="facebook">Facebook</option>
        <option value="telegram">Telegram</option>
      </select>

      <input
        type="number"
        placeholder="Max Price"
        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
      />

      <select
        value={filters.sortBy || ''}
        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
        <option value="">Default Sort</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="count-asc">Count: Low to High</option>
        <option value="count-desc">Count: High to Low</option>
      </select>

      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>

      <div>
        {services.map((service, idx) => (
          <div key={idx}>
            <p>
              {service.product} - {service.operator}: ${service.cost.toFixed(2)}
              ({service.count} available)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
*/

// ==================== CURL EXAMPLES ====================
/*
# Search countries
curl "http://localhost:5000/api/5sim/search/countries?q=russia"
curl "http://localhost:5000/api/5sim/search/countries?q=us"

# Search services - basic
curl "http://localhost:5000/api/5sim/search/services?country=russia"

# Search services - with filters
curl "http://localhost:5000/api/5sim/search/services?country=russia&product=facebook&maxPrice=5&sortBy=price-asc"

# Search services - advanced
curl "http://localhost:5000/api/5sim/search/services?country=ukraine&product=telegram&operator=virtual1&minCount=50&sortBy=count-desc"
*/

export { searchCountries, searchServices };
