(function () {
    var STORAGE_KEY = 'hmpBriefingUnlocked';
    var form = document.querySelector('.download-gate-form');
    if (!form) return;

    var fieldsEl = form.querySelector('.download-gate-fields');
    var statusEl = form.querySelector('.download-gate-status');
    var noteEl = form.querySelector('.download-gate-note');
    var endpoint = form.getAttribute('data-endpoint');
    var fileUrl = form.getAttribute('data-file');
    var fileName = (fileUrl || '').split('/').pop();

    function setStatus(message, type) {
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.className = 'download-gate-status' + (type ? ' is-' + type : '');
    }

    function isUnlocked() {
        try { return window.localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
    }

    function rememberUnlock() {
        try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* private mode */ }
    }

    function startDownload() {
        var a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function showUnlocked(autoStart) {
        fieldsEl.innerHTML = '';
        var link = document.createElement('a');
        link.className = 'download-gate-link';
        link.href = fileUrl;
        link.setAttribute('download', fileName);
        link.textContent = 'Download the briefing (PDF)';
        fieldsEl.appendChild(link);
        if (noteEl) noteEl.textContent = 'The briefing is unlocked on this device.';
        if (autoStart) startDownload();
    }

    if (isUnlocked()) {
        showUnlocked(false);
        return;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var honeypot = form.querySelector('input[name="website"]');
        if (honeypot && honeypot.value) return;

        var firstNameEl = form.querySelector('input[name="firstName"]');
        var emailEl = form.querySelector('input[name="email"]');
        var firstName = firstNameEl ? firstNameEl.value.trim() : '';
        var email = emailEl ? emailEl.value.trim() : '';

        if (!firstName) {
            setStatus('Please add your first name.', 'error');
            if (firstNameEl) firstNameEl.focus();
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            setStatus('Please use a valid email address.', 'error');
            if (emailEl) emailEl.focus();
            return;
        }

        var btn = form.querySelector('button[type="submit"]');
        var origText = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Preparing your download...';
        }
        form.setAttribute('aria-busy', 'true');
        setStatus('', '');

        var body = new URLSearchParams({
            firstName: firstName,
            email: email,
            referral: 'Blog briefing download',
            message: '[Briefing download] The Mission-Critical Talent Retention System (PDF) requested from ' + window.location.pathname
        }).toString();

        fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'Accept': 'text/plain'
            },
            body: body
        })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Request failed with status ' + response.status);
            }
            return response.text();
        })
        .then(function (text) {
            var trimmed = (text || '').trim();
            if (trimmed && !/(ok|success|submitted|active)/i.test(trimmed)) {
                throw new Error('Unexpected response: ' + trimmed);
            }
            rememberUnlock();
            form.removeAttribute('aria-busy');
            showUnlocked(true);
            setStatus('Done. Your download has started, and the button above works any time.', 'success');
        })
        .catch(function (error) {
            console.error('Briefing download request failed:', error);
            if (btn) {
                btn.disabled = false;
                btn.textContent = origText;
            }
            form.removeAttribute('aria-busy');
            setStatus('We could not start your download right now. Please try again in a moment, or email support@hmpinnacleconsulting.com for a copy.', 'error');
        });
    });
})();
