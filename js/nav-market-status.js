(function () {
    'use strict';

    var INTERVAL_MS = 5000;
    var ANIM_MS = 700;
    var _timer = null;
    var _index = 0;
    var _messages = [];
    var _animating = false;

    function timeAgo(dateStr) {
        var parts = dateStr.split('-');
        var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        var now = new Date();
        var diffMs = now - d;
        var diffH = Math.floor(diffMs / 3600000);
        if (diffH < 24) {
            return diffH <= 1 ? 'менее часа назад' : diffH + ' ' + plural(diffH, 'час', 'часа', 'часов') + ' назад';
        }
        var diffD = Math.floor(diffMs / 86400000);
        if (diffD === 1) return 'вчера';
        return diffD + ' ' + plural(diffD, 'день', 'дня', 'дней') + ' назад';
    }

    function plural(n, one, few, many) {
        var mod10 = n % 10;
        var mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    function buildMessages(objects) {
        var forSale = objects.filter(function (o) {
            var str = JSON.stringify(o).toLowerCase();
            return !str.includes('\u043f\u0440\u043e\u0434\u0430\u043d\u043e') && !str.includes('sold');
        });
        var count = forSale.length || objects.length;

        var latestDate = null;
        objects.forEach(function (o) {
            if (o.publishedAt) {
                if (!latestDate || o.publishedAt > latestDate) latestDate = o.publishedAt;
            }
        });

        var msg1 = '\u0412\u0441\u0435\u0433\u043e \u0432 \u043f\u0440\u043e\u0434\u0430\u0436\u0435 ' + count + ' ' + plural(count, '\u043e\u0431\u044a\u0435\u043a\u0442', '\u043e\u0431\u044a\u0435\u043a\u0442\u0430', '\u043e\u0431\u044a\u0435\u043a\u0442\u043e\u0432');
        var msg2 = latestDate
            ? '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u043e\u0431\u044a\u0435\u043a\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d ' + timeAgo(latestDate)
            : '\u0414\u0430\u043d\u043d\u044b\u0445 \u043e \u0434\u0430\u0442\u0430\u0445 \u043d\u0435\u0442';

        return [msg1, msg2];
    }

    function initWidget(messages) {
        var wrapper = document.getElementById('marketStatus');
        if (!wrapper) return;

        _messages = messages;
        _index = 0;
        _animating = false;

        var current = wrapper.querySelector('.status-text.current');
        var next = wrapper.querySelector('.status-text.next');
        if (!current || !next) return;

        current.textContent = _messages[0];
        next.textContent = _messages[1 % _messages.length];

        if (_timer) clearInterval(_timer);
        _timer = setInterval(function () { rotate(current, next); }, INTERVAL_MS);
    }

    function rotate(current, next) {
        if (_animating || _messages.length < 2) return;
        _animating = true;

        _index = (_index + 1) % _messages.length;
        var nextIndex = (_index + 1) % _messages.length;

        next.textContent = _messages[_index];
        next.classList.remove('slide-in');
        next.style.transform = 'translateY(100%)';
        next.style.opacity = '0';
        next.style.transition = 'none';

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                current.style.transition = 'transform ' + ANIM_MS + 'ms cubic-bezier(0.22,1,0.36,1), opacity ' + (ANIM_MS - 200) + 'ms cubic-bezier(0.22,1,0.36,1)';
                current.style.transform = 'translateY(-100%)';
                current.style.opacity = '0';

                next.style.transition = 'transform ' + ANIM_MS + 'ms cubic-bezier(0.22,1,0.36,1), opacity ' + (ANIM_MS - 200) + 'ms cubic-bezier(0.22,1,0.36,1)';
                next.style.transform = 'translateY(0)';
                next.style.opacity = '1';

                setTimeout(function () {
                    current.textContent = _messages[nextIndex];
                    current.style.transition = 'none';
                    current.style.transform = 'translateY(100%)';
                    current.style.opacity = '0';

                    var tmp = current;
                    current = next;
                    next = tmp;

                    _animating = false;
                }, ANIM_MS + 50);
            });
        });
    }

    function load() {
        var wrapper = document.getElementById('marketStatus');
        if (!wrapper) return;

        fetch('/data/objects.json')
            .then(function (r) { return r.ok ? r.json() : Promise.reject('fetch error'); })
            .then(function (data) {
                if (!Array.isArray(data) || data.length === 0) {
                    showFallback(wrapper);
                    return;
                }
                var msgs = buildMessages(data);
                initWidget(msgs);
            })
            .catch(function () { showFallback(wrapper); });
    }

    function showFallback(wrapper) {
        var current = wrapper.querySelector('.status-text.current');
        if (current) current.textContent = '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u043f\u043e \u043e\u0431\u044a\u0435\u043a\u0442\u0430\u043c';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }
})();
