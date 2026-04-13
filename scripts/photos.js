function parsePhotos(files) {
    if (files.length == 0) return;

    document.getElementById("photos-upload-area")?.remove();
    let photosSection = document.getElementById("photos-section");

    /*
    const lazyObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                let img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => {
                    URL.revokeObjectURL(img.src);
                    img.previousElementSibling.style.paddingBottom = `${img.naturalHeight / img.naturalWidth * 100}%`;
                    img.parentElement.style.width = `${img.naturalWidth * 200 / img.naturalHeight}px`;
                    img.parentElement.style.flexGrow = `${img.naturalWidth * 200 / img.naturalHeight}`;
                }
                observer.unobserve(img);
            }
        });
    });
    */

    files.forEach(file => {
        let div = document.createElement("div");
        let i = document.createElement("i");
        i.classList.add("photo-i");
        let img = document.createElement("img");
        img.classList.add("photo-item");
        img.draggable = false;
        img.loading = "lazy";
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            img.previousElementSibling.style.paddingBottom = `${img.naturalHeight / img.naturalWidth * 100}%`;
            img.parentElement.style.width = `${img.naturalWidth * 200 / img.naturalHeight}px`;
            img.parentElement.style.flexGrow = `${img.naturalWidth * 200 / img.naturalHeight}`;
        };
        
        div.append(i, img);
        photosSection.appendChild(div);
    });
}