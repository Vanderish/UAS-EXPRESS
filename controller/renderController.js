const index = (req, res) => {
    res.render('index', { title: 'Tournament Management' });
}

const login = (req, res) => {
    res.render('login', { title: 'Login' });
}

const register = (req, res) => {
    res.render('register', { title: 'Register' });
}

const tournament = (req, res) => {
    res.render('tournaments', { title: 'Tournament' });
}

export default { index, login, register, tournament };