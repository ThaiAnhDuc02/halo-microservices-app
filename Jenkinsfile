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
                stage('order-service') {
                    steps {
                        dir('order-service') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-order-service:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-order-service:${BUILD_NUMBER}
                            """
                        }
                    }
                }
                stage('order-processor') {
                    steps {
                        dir('order-processor') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-order-processor:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-order-processor:${BUILD_NUMBER}
                            """
                        }
                    }
                }
                stage('frontend') {
                    steps {
                        dir('frontend') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-frontend:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-frontend:${BUILD_NUMBER}
                            """
                        }
                    }
                }
                stage('data-collector') {
                    steps {
                        dir('data-collector') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-data-collector:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-data-collector:${BUILD_NUMBER}
                            """
                        }
                    }
                }
                stage('product-processor') {
                    steps {
                        dir('product-processor') {
                            sh """
                                docker build -t ${DOCKERHUB_REPO}-product-processor:${BUILD_NUMBER} .
                                echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                                docker push ${DOCKERHUB_REPO}-product-processor:${BUILD_NUMBER}
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
                        rm -rf manifest-repo
                        git clone https://$GH_TOKEN@github.com/ThaiAnhDuc02/halo-microservices-app-manifest.git manifest-repo

                        sed -i "s|image: ${DOCKERHUB_REPO}-api-gateway:.*|image: ${DOCKERHUB_REPO}-api-gateway:$BUILD_NUMBER|g" manifest-repo/api-gateway.yaml
                        sed -i "s|image: ${DOCKERHUB_REPO}-user-service:.*|image: ${DOCKERHUB_REPO}-user-service:$BUILD_NUMBER|g" manifest-repo/user-service.yaml
                        sed -i "s|image: ${DOCKERHUB_REPO}-product-service:.*|image: ${DOCKERHUB_REPO}-product-service:$BUILD_NUMBER|g" manifest-repo/product-service.yaml
                        sed -i "s|image: ${DOCKERHUB_REPO}-order-service:.*|image: ${DOCKERHUB_REPO}-order-service:$BUILD_NUMBER|g" manifest-repo/order-service.yaml
                        sed -i "s|image: ${DOCKERHUB_REPO}-order-processor:.*|image: ${DOCKERHUB_REPO}-order-processor:$BUILD_NUMBER|g" manifest-repo/order-processor.yaml
                        sed -i "s|image: ${DOCKERHUB_REPO}-frontend:.*|image: ${DOCKERHUB_REPO}-frontend:$BUILD_NUMBER|g" manifest-repo/frontend.yaml
                        sed -i "s|image: ${DOCKERHUB_REPO}-data-collector:.*|image: ${DOCKERHUB_REPO}-data-collector:$BUILD_NUMBER|g" manifest-repo/data-collector.yaml
                        sed -i "s|image: ${DOCKERHUB_REPO}-product-processor:.*|image: ${DOCKERHUB_REPO}-product-processor:$BUILD_NUMBER|g" manifest-repo/product-processor.yaml

                        cd manifest-repo
                        git config user.email "jenkins@ci.local"
                        git config user.name  "Jenkins"
                        git add .

                        if git diff --staged --quiet; then
                            echo "No changes to commit"
                        else
                            git commit -m "ci: update image tags to $BUILD_NUMBER"
                            git push
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
