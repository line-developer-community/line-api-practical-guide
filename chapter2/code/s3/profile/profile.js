const urlParams = new URLSearchParams(window.location.search);

const userId = urlParams.get('userId');
const displayName = urlParams.get('displayName');
const pictureUrl = urlParams.get('pictureUrl');
const email = urlParams.get('email');

document.getElementsByClassName('displayName')[0].innerHTML = `<b>${displayName}</b>`;
document.getElementsByClassName('userId')[0].textContent = userId;

if (email == undefined) {
    document.getElementsByClassName('email')[0].textContent = 'メールアドレスが取得できませんでした';
} else {
    document.getElementsByClassName('email')[0].textContent = email;
}
document.getElementsByClassName('profieImg')[0].src = pictureUrl;