pipeline {
    agent any

    environment {
        DOCKERHUB_REPO = 'anhduc8702/halo-microservices-app'
        DOCKERHUB_CREDS = credentials('dockerhub-creds')
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/ThaiAnhDuc02/halo-microservices-app.git', branch: 'main'
            }
        }

        stage('Check Commit') {
            steps {
                script {
                    def msg = sh(script: 'git log -1 --pretty=%s', returnStdout: true).trim()
                    if (msg.startsWith('ci:')) {
                        currentBuild.result = 'NOT_BUILT'
                        error("Skipping CI commit: ${msg}")
                    }
                }
            }
        }

        stage('Build & Push Images') {
            parallel {
                stage('user-service') {
                    steps {
                        dir('user-service') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-user-service:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-user-service:${BUILD_NUMBER}
                            """
                        }
                    }
                }
                stage('product-service') {
                    steps {
                        dir('product-service') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-product-service:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-product-service:${BUILD_NUMBER}
                            """
                        }
                    }
                }
                stage('api-gateway') {
                    steps {
                        dir('api-gateway') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-api-gateway:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-api-gateway:${BUILD_NUMBER}
                            """
                        }
                    }
                }
            }
        }

        stage('Update Manifest') {
            steps {
                withCredentials([string(credentialsId: 'github-manifest-token',
                                    variable: 'GH_TOKEN')]) {
                    sh '''
                        sed -i "s|image: api-gateway:.*|image: api-gateway:$BUILD_NUMBER|g" manifests/api-gateway.yaml
                        sed -i "s|image: user-service:.*|image: user-service:$BUILD_NUMBER|g" manifests/user-service.yaml
                        sed -i "s|image: product-service:.*|image: product-service:$BUILD_NUMBER|g" manifests/product-service.yaml

                        git config user.email "jenkins@ci.local"
                        git config user.name  "Jenkins"
                        git add manifests/

                        if git diff --staged --quiet; then
                            echo "No changes to commit"
                        else
                            git commit -m "ci: update image tags to $BUILD_NUMBER"
                            git push https://$GH_TOKEN@github.com/ThaiAnhDuc02/halo-microservices-app.git
                        fi
                    '''
                }
            }
        }

    }

    post {
        always {
            sh 'docker logout'
        }
    }
}
