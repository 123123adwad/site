// JUDICIAL INTRO OVERLAY REMOVAL
document.addEventListener('DOMContentLoaded', function() {
    const judicialIntro = document.getElementById('judicialIntro');
    if (judicialIntro) {
        setTimeout(function() {
            if (judicialIntro.parentNode) {
                judicialIntro.parentNode.removeChild(judicialIntro);
            }
        }, 6800); // 6.5s total (animation 6s + buffer)
    }
});
