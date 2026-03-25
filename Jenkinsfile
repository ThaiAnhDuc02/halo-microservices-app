pipeline {
    agent any

    environment {
        DOCKERHUB_REPO = 'anhduc8702/halo-microservices-app'
        DOCKERHUB_CREDS = credentials('dockerhub-credentials')
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
            }
        }

        stage('Update Manifests') {
            steps {
                sh """
                    sed -i 's|image: ${DOCKERHUB_REPO}-user-service:.*|image: ${DOCKERHUB_REPO}-user-service:${BUILD_NUMBER}|' manifests/user-service.yaml
                    sed -i 's|image: ${DOCKERHUB_REPO}-product-service:.*|image: ${DOCKERHUB_REPO}-product-service:${BUILD_NUMBER}|' manifests/product-service.yaml
                    sed -i 's|image: ${DOCKERHUB_REPO}-api-gateway:.*|image: ${DOCKERHUB_REPO}-api-gateway:${BUILD_NUMBER}|' manifests/api-gateway.yaml
                """
            }
        }
    }

    post {
        always {
            sh 'docker logout'
        }
    }
}
