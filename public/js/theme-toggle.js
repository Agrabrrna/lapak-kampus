document.addEventListener('DOMContentLoaded', () => {
    const getStoredTheme = () => localStorage.getItem('theme');
    const setStoredTheme = theme => localStorage.setItem('theme', theme);
    
    const getPreferredTheme = () => {
        const storedTheme = getStoredTheme();
        if (storedTheme) {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };
    
    const setTheme = theme => {
        if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-bs-theme', theme);
        }
    };
    
    setTheme(getPreferredTheme());
    
    const updateToggleVisual = (theme) => {
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            const circle = btn.querySelector('.theme-toggle-circle');
            const stars = btn.querySelector('.theme-stars');
            
            if (!circle) return;

            if (theme === 'dark') {
                // Dark mode: slide circle right, show moon, dark blue bg, show stars
                btn.style.background = 'linear-gradient(135deg, #1e3a5f, #312e81)';
                circle.style.left = '27px';
                circle.style.background = '#e2e8f0';
                circle.style.boxShadow = '0 0 8px rgba(99, 102, 241, 0.5)';
                circle.textContent = '🌙';
                if (stars) stars.style.opacity = '1';
            } else {
                // Light mode: slide circle left, show sun, warm bg, hide stars
                btn.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
                circle.style.left = '3px';
                circle.style.background = '#ffffff';
                circle.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
                circle.textContent = '☀️';
                if (stars) stars.style.opacity = '0';
            }
        });
    };
    
    updateToggleVisual(getPreferredTheme());
    
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setStoredTheme(newTheme);
            setTheme(newTheme);
            updateToggleVisual(newTheme);
        });
    });
});
