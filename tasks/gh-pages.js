const Git = require('nodegit');
const semv = require('semver');
const file = require('fs');
const path = require('path');
const ZERO = '0.0.0';

reset();
clone('https://github.com/Tradeshift/tradeshift-ui.git').then(compare);

/**
 * @param {Repository} repo
 */
function compare(repo) {
	console.log('Comparing versions');
	const thisversion = getlocalversion();
	const thatversion = getmatchversion(thisversion);
	if (semv.gt(thisversion, thatversion)) {
		johannes(repo, parseInt(thisversion, 10), thisversion, thatversion);
		console.log('??');
	} else {
		console.log('Nothing to see');
		reset();
	}
}

function johannes(repo, thisversion, thatversion, majorversion) {
	fileoperations(majorversion);
	setmatchversion(thatversion, thisversion);
	hansen(repo, majorversion);
}

function hansen(repo, majorversion) {
	const signature = Git.Signature.create('Foo bar', 'foo@bar.com', 123456789, 60);
	repo.refreshIndex().then(index => {
		index
			.addByPath(getfolder('gh-pages/' + majorversion))
			.then(index.write())
			.then(index.writeTree())
			.then(oid => {
				return repo.createCommit('HEAD', signature, signature, 'Total test, respect', oid, []);
			});
	});
}

/**
 * @param {number} version
 */
function fileoperations(version) {
	prepare(version);
	copydist(version);
	copyindex(version);
}

function reset() {
	console.log('Cleaning up');
	rimraf(getfolder('gh-pages'));
}

function getlocalversion() {
	return semv.clean(getpackage('../package.json').version);
}

function getmatchversion(version) {
	const match = v => parseInt(v, 10) === parseInt(version, 10);
	return (
		getpackage('gh-pages/package.json')
			.versions.map(semv.clean)
			.find(match) || ZERO
	);
}

function setmatchversion(source, target) {
	const pkg = getpackage('gh-pages/package.json');
	pkg.versions = pkg.versions
		.map(v => (v === source ? target : v))
		.concat(source === ZERO ? [target] : [])
		.sort(semv.gt);
	setpackage('gh-pages/package.json', pkg);
}

/**
 * @param {string} version
 */
function prepare(version) {
	const target = getfolder('gh-pages', version);
	if (file.existsSync(target)) {
		rimraf(target);
	}
	file.mkdirSync(target);
}

/**
 * @param {string} version
 */
function copydist(version) {
	copydir(getfolder('../', 'docs', 'dist'), getfolder('gh-pages', version, 'dist'));
}

/**
 * @param {string} version
 */
function copyindex(version) {
	file.linkSync(
		getfolder('../', 'docs', 'index.html'),
		getfolder('gh-pages', version, 'index.html')
	);
}

/**
 * @param {...string} [paths]
 * @returns {string}
 */
function getfolder(...paths) {
	return path.join(__dirname, ...paths.map(String));
}

/**
 * @returns {Object}
 */
function getpackage(where) {
	return JSON.parse(file.readFileSync(getfolder(where), 'UTF-8'));
}

function setpackage(where, object) {
	console.log(where);
	console.log(JSON.stringify(object, 0, 2));
}

/**
 * @see http://www.nodegit.org/guides/cloning/
 * @param {string} url
 * @returns {Promise}
 */
function clone(url) {
	console.log('Cloning', url);
	return Git.Clone(url, getfolder('gh-pages'), {
		checkoutBranch: 'gh-pages',
		fetchOpts: {
			callbacks: {
				certificateCheck() {
					return 1;
				}
			}
		}
	}).catch(x => {
		console.log(x);
	});
}

/**
 * Remove directory recursively
 * @param {string} dir
 */
function rimraf(dir) {
	if (file.existsSync(dir)) {
		file.readdirSync(dir).forEach(function(entry) {
			var entry_path = path.join(dir, entry);
			if (file.lstatSync(entry_path).isDirectory()) {
				rimraf(entry_path);
			} else {
				file.unlinkSync(entry_path);
			}
		});
		file.rmdirSync(dir);
	}
}

/**
 * Copy directory recursively.
 * @param {string} src
 * @param {string} dest
 */
function copydir(src, dest) {
	var exist = file.existsSync(src);
	var stats = exist && file.statSync(src);
	var isDirectory = exist && stats.isDirectory();
	if (exist && isDirectory) {
		file.mkdirSync(dest);
		file.readdirSync(src).forEach(function(name) {
			copydir(path.join(src, name), path.join(dest, name));
		});
	} else {
		file.linkSync(src, dest);
	}
}
