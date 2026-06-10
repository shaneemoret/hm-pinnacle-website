(function () {
    var players = [].slice.call(document.querySelectorAll('.webinar-player'));
    if (!players.length) return;
    players.forEach(setupGate);

    function setupGate(gate) {
        // Each webinar is gated individually: unlocking one session never
        // unlocks another, so every session captures its own lead.
        var webinarId = gate.getAttribute('data-webinar-id') || 'default';
        var storageKey = 'hmpWebinarUnlocked:' + webinarId;

        var lockedEl = gate.querySelector('.webinar-locked');
        var form = gate.querySelector('.webinar-gate-form');
        var statusEl = gate.querySelector('.download-gate-status');
        var embedUrl = gate.getAttribute('data-embed');
        var embedTitle = gate.getAttribute('data-embed-title') || 'Webinar replay';
        var watchUrl = gate.getAttribute('data-watch-url');
        var endpoint = form ? form.getAttribute('data-endpoint') : null;

        function setStatus(message, type) {
            if (!statusEl) return;
            statusEl.textContent = message || '';
            statusEl.className = 'download-gate-status' + (type ? ' is-' + type : '');
        }

        function isUnlocked() {
            try { return window.localStorage.getItem(storageKey) === '1'; } catch (e) { return false; }
        }

        function rememberUnlock() {
            try { window.localStorage.setItem(storageKey, '1'); } catch (e) { /* private mode */ }
        }

        function showPlayer() {
            var wrap = document.createElement('div');
            wrap.className = 'webinar-unlocked';
            var iframe = document.createElement('iframe');
            iframe.className = 'webinar-embed';
            iframe.src = embedUrl;
            iframe.title = embedTitle;
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('loading', 'lazy');
            wrap.appendChild(iframe);
            if (watchUrl) {
                var p = document.createElement('p');
                p.className = 'webinar-fallback';
                var a = document.createElement('a');
                a.href = watchUrl;
                a.target = '_blank';
                a.rel = 'noopener';
                a.textContent = 'Watch on LinkedIn';
                p.appendChild(document.createTextNode('Player not loading? '));
                p.appendChild(a);
                wrap.appendChild(p);
            }
            lockedEl.replaceWith(wrap);
        }

        if (isUnlocked()) {
            showPlayer();
            return;
        }

        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var honeypot = form.querySelector('input[name="website"]');
            if (honeypot && honeypot.value) return;

            var firstNameEl = form.querySelector('input[name="firstName"]');
            var lastNameEl = form.querySelector('input[name="lastName"]');
            var emailEl = form.querySelector('input[name="email"]');
            var firstName = firstNameEl ? firstNameEl.value.trim() : '';
            var lastName = lastNameEl ? lastNameEl.value.trim() : '';
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
                btn.textContent = 'Opening the replay...';
            }
            form.setAttribute('aria-busy', 'true');
            setStatus('', '');

            var body = new URLSearchParams({
                firstName: firstName,
                lastName: lastName,
                email: email,
                referral: 'Webinar replay',
                message: '[Webinar replay] ' + embedTitle + ' requested from ' + window.location.pathname
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
                showPlayer();
            })
            .catch(function (error) {
                console.error('Webinar replay request failed:', error);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = origText;
                }
                form.removeAttribute('aria-busy');
                setStatus('We could not open the replay right now. Please try again in a moment, or email support@hmpinnacleconsulting.com.', 'error');
            });
        });
    }
})();
