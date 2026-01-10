const SUPABASE_URL = 'https://dcswkznaallvcfvwaqrn.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3drem5hYWxsdmNmdndhcXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDExNzYsImV4cCI6MjA4MzUxNzE3Nn0.peCFDhEiIvRtP2W6Yr0OAwsrE-Uwm7dmS2sIUAQoA34'

// Check connection
if (typeof window.supabase === 'undefined') {
    console.error("Supabase library not loaded.");
}

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let currentId = null; 
let currentType = null; 

// 1. AUTH STATE LISTENER
client.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'block';
        if(session.user.email) {
            document.getElementById('display-email').innerText = session.user.email.split('@')[0];
        }
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('app-section').style.display = 'none';
    }
});

// 2. AUTH MODAL (FIXED INPUT ERROR)
async function showAuthModal() {
    // Biến lưu tạm dữ liệu nhập vào
    let inputEmail = '';
    let inputPass = '';

    try {
        const { isConfirmed, isDenied } = await Swal.fire({
            title: 'Welcome!',
            html:
                '<p style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">Password must be at least 6 characters</p>' +
                '<input id="swal-email" class="swal2-input" placeholder="Email">' +
                '<input id="swal-pass" class="swal2-input" type="password" placeholder="Password">',
            focusConfirm: false,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Login',
            confirmButtonColor: '#ff758c',
            denyButtonText: 'Sign Up',
            denyButtonColor: '#a18cd1',
            cancelButtonText: 'Close',
            
            // XÓA DÒNG NÀY ĐỂ HẾT LỖI: returnInputValueOnDeny: true
            
            // Lấy dữ liệu trước khi đóng cửa sổ
            preConfirm: () => {
                inputEmail = document.getElementById('swal-email').value;
                inputPass = document.getElementById('swal-pass').value;
                return [inputEmail, inputPass];
            },
            preDeny: () => {
                inputEmail = document.getElementById('swal-email').value;
                inputPass = document.getElementById('swal-pass').value;
                return [inputEmail, inputPass];
            }
        });

        if (isConfirmed || isDenied) {
            const email = inputEmail;
            const password = inputPass;

            if (!email || !password) {
                Swal.fire('Missing Info', 'Please enter both email and password.', 'warning');
                return;
            }
            if (password.length < 6) {
                Swal.fire('Password too short!', 'Password must be at least 6 characters.', 'warning');
                return;
            }

            Swal.showLoading();

            // --- LOGIN ---
            if (isConfirmed) {
                const { error } = await client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                
                Swal.fire({ icon: 'success', title: 'Login successful!', timer: 1500, showConfirmButton: false });
            } 
            
            // --- SIGN UP ---
            else if (isDenied) {
                const redirectUrl = (window.location.origin && window.location.origin !== 'null') 
                                    ? window.location.origin 
                                    : undefined;

                const { data, error } = await client.auth.signUp({ 
                    email: email, 
                    password: password,
                    options: { emailRedirectTo: redirectUrl }
                });

                if (error) throw error;

                if (data && !data.session) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Check your email!',
                        text: 'Please check your email to confirm your account.',
                        confirmButtonColor: '#ff758c'
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Registration successful!',
                        text: 'You have been automatically logged in.',
                        confirmButtonColor: '#ff758c'
                    });
                }
            }
        }
    } catch (err) {
        console.error("Auth Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: err.message || 'Something went wrong!',
            confirmButtonColor: '#ff758c'
        });
    }
}

async function handleLogout() {
    await client.auth.signOut();
    Swal.fire('Logged out', 'See you again!', 'success');
}

// 3. FIND PLACE FUNCTION
async function findPlace(type) {
    const wish = document.getElementById('wish').value || null;
    const days = document.getElementById('days').value || 3;
    currentType = type; 

    const btn = type === 'FOOD' ? document.querySelector('.btn-primary') : document.querySelector('.btn-secondary');
    const originalText = btn.innerHTML;
    btn.innerHTML = "<i class='ri-loader-4-line'></i> Searching...";
    
    const card = document.getElementById('result-card');
    card.classList.remove('open'); 
    card.style.display = 'none';

    try {
        const functionName = (type === 'FOOD') ? 'get_smart_food' : 'get_smart_coffee';
        const { data, error } = await client.rpc(functionName, {
            wish_category: wish,
            cooldown_days: days
        });

        if (error) throw error;

        if (data && data.length > 0) {
            const item = data[0];
            currentId = item.id;

            card.style.display = 'block';
            document.getElementById('name').innerText = item.name;
            document.getElementById('desc').innerText = item.description || 'No description available...'; 
            document.getElementById('img').src = item.image_url || 'https://via.placeholder.com/400x250?text=No+Image';

            setTimeout(() => {
                card.classList.add('open');
                const soundWin = document.getElementById('sound-win');
                if(soundWin) soundWin.play();
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.7 },
                    colors: ['#ff758c', '#ff7eb3', '#ffd700']
                });
            }, 800); 
        } else {
            Swal.fire({ icon: 'info', title: 'Not found!', text: 'Try changing your wish.', confirmButtonColor: '#ff758c' });
        }
    } catch (err) {
        console.error("Search Error:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#ff758c' });
    } finally {
        btn.innerHTML = originalText;
    }
}

// 4. CONFIRM SELECTION
async function confirmSelection() {
    if (!currentId || !currentType) return;

    const btn = document.querySelector('.btn-confirm');
    btn.innerHTML = "<i class='ri-loader-4-line'></i> Saving...";

    try {
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            Swal.fire('Error', 'You are not logged in!', 'error');
            return;
        }

        let tableName = (currentType === 'FOOD') ? 'food_history' : 'coffee_history';
        let columnIdName = (currentType === 'FOOD') ? 'food_id' : 'coffee_id';

        const payload = {};
        payload[columnIdName] = currentId;
        payload['user_id'] = user.id;

        const { error } = await client.from(tableName).insert(payload);
        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'Confirmed! 🎉',
            text: 'Saved to your history.',
            confirmButtonColor: '#ff758c',
            timer: 2000,
            showConfirmButton: false
        });

        const card = document.getElementById('result-card');
        card.classList.remove('open');
        setTimeout(() => { card.style.display = 'none'; }, 500);
        document.getElementById('wish').value = '';

    } catch (err) {
        console.error("Save Error:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#ff758c' });
    } finally {
        btn.innerHTML = "<i class='ri-check-line'></i> Confirm Selection";
    }
}