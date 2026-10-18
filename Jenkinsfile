// ============================================================================
// Jenkinsfile — CI pipeline, as code.
// ============================================================================
// This replaces the pipeline script that was pasted into the Jenkins job's
// config. Keeping it in the repo is the standard "Pipeline as Code" pattern,
// and it earns its keep in three ways: the pipeline is reviewed in pull
// requests like any other change, its history is in git, and a rebuilt
// Jenkins picks it up instead of losing it.
//
// To switch the job over: Jenkins -> bookclub-ci -> Configure -> Pipeline ->
// Definition: "Pipeline script from SCM" -> Git ->
// https://github.com/HeenalA/bookclub-web-app.git -> Script Path: Jenkinsfile
// ============================================================================

pipeline {
    agent any

    options {
        timeout(time: 15, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install toolchains') {
            steps {
                // The base Jenkins image ships Java and nothing else, so both
                // runtimes have to be installed into the container before
                // anything can run.
                sh '''
                    apt-get update
                    apt-get install -y python3 python3-pip curl
                    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
                    apt-get install -y nodejs
                    python3 --version
                    node --version
                '''
            }
        }

        stage('Backend tests') {
            steps {
                dir('backend') {
                    // requirements-dev.txt is test-only (just pytest), kept
                    // separate from the full runtime deps on purpose: the
                    // runtime list includes psycopg2-binary, which has no
                    // prebuilt wheel for this container and tries to compile
                    // from source against a Postgres toolchain that is not
                    // installed. The tests touch no database, so they should
                    // never have been pulling it in.
                    sh 'pip3 install -r requirements-dev.txt --break-system-packages'
                    sh 'python3 -m pytest tests/ --junitxml=results.xml'
                }
            }
        }

        stage('Frontend install') {
            steps {
                dir('frontend') {
                    // `npm ci` rather than `npm install`: it installs exactly
                    // what package-lock.json pins and verifies each package
                    // against its recorded hash, so a tampered or drifted
                    // dependency fails the build instead of shipping.
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend lint') {
            steps {
                dir('frontend') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Frontend build') {
            steps {
                dir('frontend') {
                    // Builds without the Supabase env vars set. That is
                    // deliberate — it proves the app compiles and that no
                    // secret is required at build time. The app shows its
                    // setup screen when the variables are absent.
                    sh 'npm run build'
                }
            }
        }

        stage('Security checks') {
            steps {
                dir('frontend') {
                    // Fails the build on a high or critical advisory in a
                    // runtime dependency. Dev-only tooling is excluded,
                    // since it never reaches a user's browser.
                    sh 'npm audit --omit=dev --audit-level=high'
                }
                // Catches an obvious mistake no linter would: the
                // service_role key bypasses every security policy and must
                // never be committed. A plain grep is enough, and it costs
                // nothing to run on every build.
                sh '''
                    if grep -rn "service_role" --include="*.js" --include="*.jsx" \
                           --include="*.json" --include="*.html" frontend/src frontend/index.html 2>/dev/null; then
                        echo "ERROR: a service_role reference is present in frontend code."
                        exit 1
                    fi
                    echo "No service_role key in frontend code."
                '''
            }
        }

        stage('Report') {
            steps {
                junit 'backend/results.xml'
            }
        }
    }

    post {
        success {
            echo 'All checks passed.'
        }
        failure {
            echo 'Build failed — read the first error above, not the last.'
        }
        always {
            // Stops a 300MB node_modules accumulating in the workspace
            // between builds.
            dir('frontend') {
                sh 'rm -rf node_modules || true'
            }
        }
    }
}
